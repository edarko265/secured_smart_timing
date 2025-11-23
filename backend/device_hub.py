# device_hub.py
import socket, threading, json, time, queue
from datetime import datetime

DEVICES = {}          # in-memory view for /api/devices
EVENT_FEED = queue.Queue()
TARGET_COUNT = 0      # how many devices user asked to connect

def _now_ms():
    return int(time.time() * 1000)

def _upsert_device(obj: dict, ip_from: str):
    cone_id = obj.get("cone_id") or obj.get("id") or "UNKNOWN"
    dev = DEVICES.get(cone_id, {
        "id": cone_id,
        "name": cone_id.replace("_", " ").title(),
        "model": obj.get("model") or "ESP32",
        "mode": obj.get("mode") or "centralized",
        "ip": obj.get("ip") or ip_from,
        "signal": obj.get("rssi") or obj.get("signal") or None,
        "status": obj.get("status") or "online",
        "last_seen": _now_ms(),
        "connection": "tcp",
    })
    # update
    if obj.get("rssi") is not None:     dev["signal"] = obj["rssi"]
    if obj.get("signal") is not None:   dev["signal"] = obj["signal"]
    if obj.get("ip"):                   dev["ip"] = obj["ip"]
    if obj.get("status"):               dev["status"] = obj["status"]
    dev["last_seen"] = _now_ms()

    DEVICES[cone_id] = dev
    EVENT_FEED.put({"t": "device.updated", "data": dev})

class _TcpHub:
    def __init__(self):
        self._running = False
        self._th = None

    def start_tcp(self, port: int):
        if self._running: return
        self._running = True

        def _serve():
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(("0.0.0.0", port))
                s.listen(8)
                print(f"[HUB] TCP listening :{port}")
                while self._running:
                    try:
                        s.settimeout(1.0)
                        conn, addr = s.accept()
                    except socket.timeout:
                        continue
                    threading.Thread(target=self._client, args=(conn, addr), daemon=True).start()

        self._th = threading.Thread(target=_serve, daemon=True)
        self._th.start()

    def _client(self, conn: socket.socket, addr):
         ip = addr[0]
         buff = b""
         conn.settimeout(5.0)
         try:
             while self._running:
                 try:
                     data = conn.recv(4096)
                     if not data:
                         break
                     buff += data
                     while b"\n" in buff:
                         line, buff = buff.split(b"\n", 1)
                         if not line.strip():
                             continue
                         try:
                             obj = json.loads(line.decode("utf-8"))
                             _upsert_device(obj, ip_from=ip)
                         except Exception as e:
                             EVENT_FEED.put({"t": "error", "data": f"parse: {e}"})
                 except TimeoutError:
                # heartbeat gap ? no problem, just continue waiting
                     continue
         finally:
             conn.close()


    def stop_tcp(self):
        self._running = False
        print("[HUB] TCP stop requested")

    # stubs for decentralized demo switch
    def start_udp(self, port: int):
        print(f"[HUB] (stub) UDP listening :{port}")

    def stop_udp(self):
        pass

HUB = _TcpHub()
