import ssl, socket, threading, json
from datetime import datetime
from db import save_heartbeat, save_event

context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain("certs/cert.pem","certs/key.pem")

def handle(conn, addr):
    ip=addr[0]
    f=conn.makefile("rb")
    try:
        for line in f:
            obj=json.loads(line.decode().strip())
            if obj.get("type")=="heartbeat":
                now=datetime.now().isoformat(timespec="milliseconds")
                save_heartbeat(obj["cone_id"], ip, int(obj.get("rssi",-65)), "centralized", now)
            elif obj.get("type")=="timestamp":
                now=datetime.now().isoformat(timespec="milliseconds")
                save_event(now, obj["cone_id"], "info", f"Key:{obj.get('key','space')}")
    finally:
        conn.close()

sock=socket.socket(); sock.bind(("0.0.0.0",8443)); sock.listen(8)
with context.wrap_socket(sock, server_side=True) as ssock:
    print("[TLS] listening :8443")
    while True:
        c,a=ssock.accept()
        threading.Thread(target=handle, args=(c,a), daemon=True).start()
