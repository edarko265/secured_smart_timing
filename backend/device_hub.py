import asyncio, json, socket, threading, queue
from datetime import datetime
from typing import Dict
from db import save_heartbeat, save_event

EVENT_FEED: "queue.Queue[dict]" = queue.Queue()
DEVICES: Dict[str, dict] = {}  # cone_id -> {ip,rssi,last_seen,mode}

def push_event(item:dict):
    EVENT_FEED.put(item)

def update_device(cone_id:str, ip:str, rssi:int, mode:str):
    now=datetime.now().isoformat(timespec="milliseconds")
    DEVICES[cone_id]={"ip":ip,"rssi":rssi,"last_seen":now,"mode":mode}
    save_heartbeat(cone_id, ip, rssi, mode, now)
    push_event({"ts":now,"cone_id":cone_id,"severity":"success","msg":f"Heartbeat ({mode})"})

# -------- centralized (TCP JSON lines) ----------
async def handle_tcp(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    ip = writer.get_extra_info("peername")[0]
    try:
        while True:
            line = await reader.readline()
            if not line: break
            obj=json.loads(line.decode().strip())
            t=obj.get("type","")
            if t=="heartbeat":
                update_device(obj["cone_id"], ip, int(obj.get("rssi",-65)), "centralized")
            elif t=="timestamp":
                now=datetime.now().isoformat(timespec="milliseconds")
                save_event(now, obj["cone_id"], "info", f"Key:{obj.get('key','space')}")
                push_event({"ts":now,"cone_id":obj["cone_id"],"severity":"info","msg":"Timestamp"})
    except Exception as e:
        now=datetime.now().isoformat(timespec="milliseconds")
        push_event({"ts":now,"cone_id":"-", "severity":"warning","msg":f"Malformed from {ip}: {e}"})
    finally:
        writer.close(); await writer.wait_closed()

async def run_tcp_server(port:int=8080):
    server = await asyncio.start_server(handle_tcp,"0.0.0.0",port)
    print(f"[TCP] listening :{port}")
    async with server: await server.serve_forever()

# -------- decentralized (UDP broadcast monitor) ----------
def run_udp_server(stop: threading.Event, port:int=9090):
    sock=socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("",port))
    print(f"[UDP] listening :{port}")
    while not stop.is_set():
        try:
            data, addr = sock.recvfrom(2048)
            obj = json.loads(data.decode())
            if obj.get("type")=="heartbeat":
                update_device(obj["cone_id"], addr[0], int(obj.get("rssi",-65)), "decentralized")
            elif obj.get("type")=="timestamp":
                now=datetime.now().isoformat(timespec="milliseconds")
                save_event(now, obj["cone_id"], "info", f"Key:{obj.get('key','space')}")
                push_event({"ts":now,"cone_id":obj["cone_id"],"severity":"info","msg":"Timestamp (UDP)"})
        except Exception:
            continue
    sock.close()

class Hub:
    def __init__(self):
        self.loop=None
        self.tcp_thread=None
        self.udp_thread=None
        self.udp_stop=threading.Event()

    def start_tcp(self, port:int=8080):
        if self.loop: return
        self.loop=asyncio.new_event_loop()
        def _run():
            asyncio.set_event_loop(self.loop)
            self.loop.create_task(run_tcp_server(port))
            self.loop.run_forever()
        self.tcp_thread=threading.Thread(target=_run,daemon=True); self.tcp_thread.start()

    def stop_tcp(self):
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
            self.loop=None; self.tcp_thread=None

    def start_udp(self, port:int=9090):
        if self.udp_thread: return
        self.udp_stop.clear()
        self.udp_thread=threading.Thread(target=run_udp_server,args=(self.udp_stop,port),daemon=True)
        self.udp_thread.start()

    def stop_udp(self):
        if self.udp_thread:
            self.udp_stop.set()
            self.udp_thread=None

HUB=Hub()
