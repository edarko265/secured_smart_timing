import network, socket, time, json

SSID = "DNA-WIFI-7C58"
PASS = "85801732190"
CONE_ID = "ESP32-01"      # ← change per cone
PORT = 9090               # must match HUB.start_udp in backend

def connect_wifi():
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    if not sta.isconnected():
        print("Connecting to WiFi...")
        sta.connect(SSID, PASS)
        while not sta.isconnected():
            print("  waiting...")
            time.sleep(1)
    print("WiFi OK:", sta.ifconfig())

def main_loop():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    dest = ("255.255.255.255", PORT)

    last = time.ticks_ms()
    sta = network.WLAN(network.STA_IF)

    while True:
        # Reconnect if WiFi drops
        if not sta.isconnected():
            connect_wifi()

        if time.ticks_diff(time.ticks_ms(), last) > 5000:
            rssi = sta.status("rssi") or -65
            payload = {
                "type": "heartbeat",
                "cone_id": CONE_ID,
                "rssi": int(rssi),
            }
            try:
                s.sendto(json.dumps(payload).encode(), dest)
                print("sent:", payload)
            except OSError as e:
                print("send error:", e)
            last = time.ticks_ms()

        time.sleep(0.2)

connect_wifi()
main_loop()
