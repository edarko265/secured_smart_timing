# main_udp_p2p.py
#
# Decentralised UDP broadcast between ESP32 cones.
# - Each cone sends JSON heartbeats every 5 s.
# - Each cone listens on the same UDP port and prints messages from others.
# - No Raspberry Pi server is required for cones to talk to each other.
#
# Configure CONE_ID, SSID, PASS per deployment.

import network
import socket
import time
import json

SSID = "DNA-WIFI-7C58"      # CHANGE if needed
PASS = "85801732190"        # CHANGE if needed
CONE_ID = "ESP32-01"        # UNIQUE per cone (ESP32-01, ESP32-02, ...)
PORT = 9090                 # Must match backend HUB.start_udp if Pi listens too

HEARTBEAT_MS = 5000         # 5 s

def connect_wifi():
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    if not sta.isconnected():
        print("Connecting to WiFi...")
        sta.connect(SSID, PASS)
        while not sta.isconnected():
            print("  waiting for WiFi...")
            time.sleep(1)
    print("WiFi OK:", sta.ifconfig())
    return sta

def main_loop():
    sta = connect_wifi()

    # UDP socket: broadcast + listen on PORT
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.settimeout(0.0)  # non-blocking
    s.bind(("", PORT))

    dest = ("255.255.255.255", PORT)
    last = time.ticks_ms()

    print("UDP P2P loop starting on port", PORT)

    while True:
        # Reconnect if Wi-Fi drops
        if not sta.isconnected():
            sta = connect_wifi()

        # 1) Try to receive anything from other cones (non-blocking)
        try:
            data, addr = s.recvfrom(512)
            try:
                msg = json.loads(data)
            except ValueError:
                print("recv from", addr, "non-JSON:", data)
                msg = None

            if msg:
                src = msg.get("cone_id", "?")
                if src != CONE_ID:
                    print("heard from peer:", src, "at", addr, "msg:", msg)
                else:
                    # Our own broadcast echoed back (some routers do this)
                    # You can ignore or log if you want.
                    pass
        except OSError:
            # No data available (EAGAIN), just continue
            pass

        # 2) Periodic heartbeat broadcast
        now = time.ticks_ms()
        if time.ticks_diff(now, last) >= HEARTBEAT_MS:
            rssi = sta.status("rssi") or -65
            ip = sta.ifconfig()[0]
            payload = {
                "type": "heartbeat",
                "cone_id": CONE_ID,
                "ip": ip,
                "rssi": int(rssi),
                "status": "online",
            }
            try:
                s.sendto(json.dumps(payload).encode(), dest)
                print("sent:", payload)
            except OSError as e:
                print("send error:", e)
            last = now

        time.sleep(0.1)


if __name__ == "__main__":
    main_loop()
