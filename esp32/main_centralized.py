# main_centralized.py (MicroPython)
import network, socket, time, json
SSID="DNA-WIFI-7C58"; PASS="85801732190"
PI_IP="192.168.1.181"; PORT=8080
CONE_ID="ESP32-02"   # make each unique: ESP32-01/ESP32-02/ESP32-03

def wifi():
    sta=network.WLAN(network.STA_IF); sta.active(True)
    if not sta.isconnected():
        sta.connect(SSID,PASS)
        while not sta.isconnected():
            time.sleep(0.5)
    print("Wi-Fi:", sta.ifconfig())
    return sta

def send_json(sock,obj):
    sock.send((json.dumps(obj)+"\n").encode())

def loop():
    sta = wifi()
    while True:
        try:
            s=socket.socket()
            s.connect((PI_IP,PORT))
            # --- register once per (re)connection
            ip = sta.ifconfig()[0]
            rssi = sta.status('rssi') or -65
            send_json(s, {"type":"register","cone_id":CONE_ID,"ip":ip,"rssi":int(rssi),"status":"online","mode":"centralized"})
            last=time.ticks_ms()
            while True:
                if time.ticks_diff(time.ticks_ms(),last)>5000:
                    rssi=sta.status('rssi') or -65
                    send_json(s, {"type":"heartbeat","cone_id":CONE_ID,"ip":ip,"rssi":int(rssi),"status":"online"})
                    last=time.ticks_ms()
                time.sleep(0.2)
        except Exception as e:
            print("reconnect:",e); time.sleep(1)

loop()
