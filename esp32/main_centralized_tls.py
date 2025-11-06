import network, socket, time, json, ussl
import hashlib

SSID="DNA-WIFI-7C58"; PASS="85801732190"
PI_IP="192.168.1.173"; PORT=8443
CONE_ID="CONE_A"
SERVER_FPR_HEX="6D:8E:1B:AF:49:F6:DB:30:87:37:B5:A3:34:F8:E6:9F:66:69:02:CB:65:DE:C1:A6:1E:4B:AC:E0:8B:00:D9:DC"  # 64 hex chars

def wifi():
    sta=network.WLAN(network.STA_IF); sta.active(True)
    if not sta.isconnected():
        sta.connect(SSID,PASS)
        while not sta.isconnected(): print("ok"); time.sleep(1)
def pin(s):
    der=s.getpeercert(True)
    fpr=hashlib.sha256(der).hexdigest()
    if fpr.lower()!=SERVER_FPR_HEX.lower(): raise Exception("pinning failed")

def send_json(s,obj): s.write((json.dumps(obj)+"\n").encode())
def loop():
    while True:
        try:
            raw=socket.socket(); raw.connect((PI_IP,PORT))
            s=ussl.wrap_socket(raw); pin(s)
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
