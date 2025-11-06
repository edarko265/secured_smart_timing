import network, socket, time, json
SSID="DNA-WIFI-7C58"; PASS="85801732190"
CONE_ID="CONE_A"; PORT=9090

def wifi():
    sta=network.WLAN(network.STA_IF); sta.active(True)
    if not sta.isconnected():
        sta.connect(SSID,PASS)
        while not sta.isconnected(): print("ok"); time.sleep(1)

def loop():
    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET,socket.SO_BROADCAST,1)
    to=("255.255.255.255",PORT)
    last=time.ticks_ms()
    while True:
        if time.ticks_diff(time.ticks_ms(),last)>5000:
            rssi=network.WLAN(network.STA_IF).status('rssi') or -65
            s.sendto(json.dumps({"type":"heartbeat","cone_id":CONE_ID,"rssi":int(rssi)}).encode(),to)
            last=time.ticks_ms()
        time.sleep(0.2)

wifi(); loop()
