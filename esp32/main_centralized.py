import network, socket, time, json
SSID="DNA-WIFI-7C58"; PASS="85801732190"
PI_IP="192.168.1.181"; PORT=8080
CONE_ID="CONE_A"

def wifi():
    sta=network.WLAN(network.STA_IF); sta.active(True)
    if not sta.isconnected():
        sta.connect(SSID,PASS)
        while not sta.isconnected(): print("ok"); time.sleep(1)
    print("Wi-Fi:", sta.ifconfig())

def send_json(sock,obj):
    sock.send((json.dumps(obj)+"\n").encode())

def loop():
    while True:
        try:
            s=socket.socket(); s.connect((PI_IP,PORT))
            last=time.ticks_ms()
            while True:
                if time.ticks_diff(time.ticks_ms(),last)>5000:
                    rssi=network.WLAN(network.STA_IF).status('rssi') or -65
                    send_json(s,{"type":"heartbeat","cone_id":CONE_ID,"rssi":int(rssi)})
                    last=time.ticks_ms()
                time.sleep(0.2)
        except Exception as e:
            print("reconnect:",e); time.sleep(1)

wifi(); loop()
