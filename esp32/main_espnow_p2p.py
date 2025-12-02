# main_espnow_p2p.py
#
# Pure ESP-NOW P2P between ESP32 cones.
# - No WiFi AP required.
# - Each cone sends JSON beacons.
# - Each cone listens and prints messages from peers.
#
# Configure CONE_ID and PEERS[] with MAC addresses of other cones.

import network
import espnow
import time
import json

CONE_ID = "ESP32-01"   # set unique ID per cone

# Replace these example MACs with the *other* cones' MACs
# Use the output from get_mac.py
PEERS = [
    # b'\x24\x0a\xc4\x11\x22\x33',  # example
]


def setup_espnow():
    # ESP-NOW requires STA_IF active
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    sta.config(pm=0xa11140)  # optional: disable power-save for more reliability
    print("STA MAC:", sta.config('mac'))

    e = espnow.ESPNow()
    e.active(True)

    # Add peers (other cones)
    for m in PEERS:
        try:
            e.add_peer(m)
            print("Added peer:", m)
        except OSError as err:
            print("Peer add error:", m, err)

    return e


def main():
    e = setup_espnow()
    last = time.ticks_ms()
    HEARTBEAT_MS = 5000

    print("ESP-NOW P2P loop starting...")

    while True:
        # 1) Receive any messages (non-blocking)
        try:
            host, msg = e.recv(0)   # 0 = non-blocking
        except OSError:
            host, msg = None, None

        if msg:
            try:
                data = json.loads(msg)
            except ValueError:
                print("Raw recv from", host, ":", msg)
                data = None

            if data:
                src = data.get("cone_id", "?")
                if src != CONE_ID:
                    print("heard from peer:", src, "from MAC:", host, "msg:", data)
                else:
                    # Our own message echoed back (can ignore)
                    pass

        # 2) Periodic beacon to all peers
        now = time.ticks_ms()
        if time.ticks_diff(now, last) >= HEARTBEAT_MS:
            payload = {
                "type": "heartbeat",
                "cone_id": CONE_ID,
                "ts_ms": now,
            }
            msg = json.dumps(payload).encode()

            # Send the same message to all peers
            for m in PEERS:
                try:
                    e.send(m, msg, sync=False)
                    print("sent to", m, ":", payload)
                except OSError as err:
                    print("send error to", m, ":", err)

            last = now

        time.sleep(0.1)


if __name__ == "__main__":
    main()
