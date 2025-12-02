Smart Timing System — Centralised, Decentralised & Secure IoT Performance Platform
Don't panic, I will fix the README. 
🧩 Overview

The Smart Timing System is a hybrid IoT timing and cybersecurity analysis platform built for athlete sprint cones, enabling fast and secure timestamp logging across centralised, decentralised, and encrypted architectures.

This system powers the engineering thesis comparing:

Centralised TCP/WebSocket architecture

Decentralised UDP & ESP-NOW peer-to-peer device meshes

TLS-secured communication (encrypted benchmarking)

The platform supports real-time device discovery, live event streaming, run timestamps, and dynamic switching between centralised and decentralised modes — all visualised in a modern React + Tailwind dashboard.

🏗️ Architecture Summary

1. Centralised Mode (TCP/WebSockets)

Flow: ESP32 Cones → Raspberry Pi (FastAPI + WebSocket Hub) → React Dashboard

Each ESP32 sends heartbeats & timestamps.

The Pi handles logging, saving, and device presence.

Browser receives live events over WebSockets.

2. Decentralised Mode (UDP Broadcast / ESP-NOW)

Flow: UDP Broadcast + ESP-NOW P2P

ESP32 A ⇄ ESP32 B ⇄ ESP32 C ⇄ ESP32 D
      \        |        /        |
       UDP Broadcast + ESP-NOW P2P


ESP32 devices communicate directly.

No central node required.

Higher resilience & lower latency.

Ideal for cybersecurity testing.

3. Secure Mode (TLS or DTLS)

TLS server runs on Raspberry Pi (tls_server.py).

ESP32 sends encrypted telemetry.

Traffic verified via Wireshark (encrypted payload + certificate handshake).

Used for encryption-overhead analysis in the thesis.

🛠️ Tech Stack

Frontend

Framework: React 18 (Vite)

Language: TypeScript

Styling: TailwindCSS

Communication: WebSocket live event feed

Backend

Framework: FastAPI (Python 3.12)

Database: SQLite or MariaDB

Protocols: WebSockets, TCP, UDP

Security: Custom TLS server (ssl module)

ESP32 Firmware

Language: MicroPython

Features:

UDP Broadcast (main_udp_p2p.py)

ESP-NOW P2P mesh (main_espnow_p2p.py)

WiFi RSSI reporting

TLS prototype client

Testing & Security Tools

Wireshark

tcpdump

Raspberry Pi 4/5

Kali Linux (monitor mode)

📦 Installation & Setup

1. Clone the Repository

git clone [https://github.com/edarko265/secured_smart_timing](https://github.com/edarko265/secured_smart_timing)
cd secured_smart_timing


2. Backend Setup

Navigate to the backend directory, install dependencies, and start the API.

cd backend
pip install -r requirements.txt

# Start the Main API
python app.py


The API runs at: http://0.0.0.0:9000

Optional: Start the TLS Server
For encrypted communication testing:

python tls_server.py


3. Frontend Setup

Navigate to the frontend directory, install dependencies, and run the development server.

cd frontend
npm install
npm run dev


The Dashboard runs at: http://localhost:5173

4. ESP32 Firmware Flashing

You can upload the specific firmware file based on the mode you wish to test.

# Example using mpremote
mpremote connect /dev/tty.usbmodem* fs cp main_udp_p2p.py :main.py
mpremote reset


File

Description

main_udp_p2p.py

Decentralised UDP mode

main_espnow_p2p.py

ESP-NOW P2P mesh

tls_client.py

TLS client prototypes (optional)

📊 Testing & Benchmarking

The thesis associated with this project evaluates:

Packet Visibility vs. Encryption: Wireshark captures confirming UDP plaintext vs. TLS encrypted payloads.

Latency Differences: Comparison of TCP vs. UDP vs. ESP-NOW speed.

Resilience: Analysis of MITM attacks and single-point failures.

Performance Overhead: The cost of running TLS on embedded hardware.

Wireshark Confirmation:

✅ UDP plaintext readable

✅ Centralised TCP timestamps visible

✅ TLS fully encrypted

✅ ESP-NOW frame exchanges detected (802.11 vendor frames)

📁 Project Structure

secured_smart_timing/
│
├── backend/
│   ├── app.py              # Main FastAPI application
│   ├── tls_server.py       # Standalone TLS server
│   ├── db.py               # Database connection logic
│   ├── device_hub.py       # Device management logic
│   ├── secure_timing.db    # SQLite Database
│   └── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── api.ts          # API fetch logic
│   │   ├── components/     # UI Components
│   │   └── styles.css      # Global styles
│   └── vite.config.ts      # Vite configuration
│
├── esp32/
│   ├── main_udp_p2p.py     # MicroPython UDP logic
│   ├── main_espnow_p2p.py  # MicroPython ESP-NOW logic
│   └── get_mac.py          # Utility to read MAC address
│
└── README.md


🔐 Security Insights

TLS dramatically improves confidentiality but introduces processing overhead.

ESP-NOW offers high resilience and speed but lacks built-in payload encryption in standard configuration.

UDP Decentralised Mode resists single-point failures (no central server needed).

FastAPI Backend benefits from strict CORS settings and firewalling.

📜 License

This project is licensed under the MIT License.

🎓 Academic Citation

If referencing this system for academic or research purposes:

Darko, E. (2025). Smart Timing System — Centralised, Decentralised & Secure IoT Performance Platform. Savonia University of Applied Sciences.

⭐ Acknowledgements

Savonia UAS

FastAPI & React Communities

Espressif Systems (ESP32)

Wireshark Foundation
