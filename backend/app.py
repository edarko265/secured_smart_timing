from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from device_hub import HUB, EVENT_FEED, DEVICES
from db import ensure_tables
import time, json

app=FastAPI(title="Secure Timing Ethos API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
ensure_tables()

@app.get("/api/devices")
def devices():
    return DEVICES

@app.post("/api/mode/{mode}")
def switch_mode(mode:str):
    if mode=="centralized":
        HUB.stop_udp(); HUB.start_tcp(8080)
    elif mode=="decentralized":
        HUB.stop_tcp(); HUB.start_udp(9090)
    else:
        return {"ok":False,"error":"mode must be centralized|decentralized"}
    return {"ok":True,"mode":mode}

@app.websocket("/ws/events")
async def ws_events(ws:WebSocket):
    await ws.accept()
    try:
        while True:
            # drain queued events to frontend
            batch=[]
            while True:
                try: batch.append(EVENT_FEED.get_nowait())
                except: break
            if batch:
                await ws.send_text(json.dumps({"type":"events","data":batch}))
            await ws.receive_text()  # keepalive or ping from client
    except WebSocketDisconnect:
        pass

# quick index test (optional)
@app.get("/")
def index():
    return HTMLResponse("<h2>Secure Timing Ethos API</h2>")

if __name__=="__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=9000, reload=False)
