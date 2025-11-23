# app.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from device_hub import HUB, EVENT_FEED, DEVICES
from db import ensure_tables, save_run, list_runs
import json

ensure_tables()

app = FastAPI(title="Secure Timing Ethos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------- basic APIs ---------------------------------------


@app.get("/api/devices")
def devices():
    # DEVICES comes from device_hub and is already updated by TCP/UDP listeners
    return DEVICES


@app.post("/api/mode/{mode}")
def switch_mode(mode: str):
    if mode == "centralized":
        HUB.stop_udp()
        HUB.start_tcp(8080)
    elif mode == "decentralized":
        HUB.stop_tcp()
        HUB.start_udp(9090)
    else:
        return {"ok": False, "error": "mode must be centralized|decentralized"}
    return {"ok": True, "mode": mode}


# -------------------------- timestamps / runs --------------------------------


@app.post("/api/runs")
async def api_save_run(payload: dict):
    """
    Body example:
    {
      "runner": "eric",
      "mode": "centralized",
      "stamps": [
         {"device_id": "...", "device_label": "...", "ts_iso": "..."},
         ...
      ]
    }
    """
    runner = (payload.get("runner") or "").strip() or "Unknown"
    mode = payload.get("mode") or "centralized"
    stamps = payload.get("stamps") or []
    run_id = save_run(runner, mode, stamps)
    runs = list_runs(limit=1)
    return {"ok": True, "id": run_id, "run": runs[0] if runs else None}


@app.get("/api/runs")
async def api_list_runs():
    return list_runs(limit=50)


# -------------------------- websocket events ---------------------------------


@app.websocket("/ws/events")
async def ws_events(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            batch = []
            while True:
                try:
                    batch.append(EVENT_FEED.get_nowait())
                except Exception:
                    break
            if batch:
                await ws.send_text(json.dumps({"type": "events", "data": batch}))
            # keep the connection alive (frontend sends pings)
            try:
                await ws.receive_text()
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass


@app.get("/")
def index():
    return HTMLResponse("<h2>Secure Timing Ethos API</h2>")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=9000, reload=False)
