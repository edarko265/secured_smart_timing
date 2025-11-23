// ---------------------------------------------------------
//  Secure Timing Ethos — Unified API Client
// ---------------------------------------------------------

export type Device = {
  id: string
  name?: string
  model?: string
  mode?: "centralized" | "decentralized" | string
  ip?: string
  signal?: number
  rssi?: number // optional, used by App.tsx display
  status?: "online" | "connected" | "offline" | "breached" | "intercepted" | string
  last_seen?: number
  connection?: "tcp" | "udp" | "esp-now" | string
}

// WebSocket event types
export type EventItem = { t: string; data: any }

// ---------------------------------------------------------
//  Base URLs (automatic + env override)
// ---------------------------------------------------------

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ??
  `http://${window.location.hostname}:9000`

const WS_URL =
  (import.meta as any).env?.VITE_WS_URL ??
  `ws://${window.location.hostname}:9000/ws/events`

// ---------------------------------------------------------
//  Utility — always return an array
// ---------------------------------------------------------
function forceArray(v: any): any[] {
  if (Array.isArray(v)) return v
  if (v && typeof v === "object") return Object.values(v)
  return []
}

// ---------------------------------------------------------
//  Core types used by App.tsx
// ---------------------------------------------------------

export type SystemMode = "centralized" | "decentralized"
export type DeviceInfo = Device

export type RunStampPayload = {
  device_id: string
  device_label: string
  ts_iso: string
}

export type RunSummary = {
  id: number
  created_at: string
  runner: string
  mode: SystemMode
  cone1_id?: string
  cone1_ts?: string
  cone2_id?: string
  cone2_ts?: string
}

// ---------------------------------------------------------
//  GET /api/devices
// ---------------------------------------------------------
export async function getDevices(): Promise<Device[]> {
  const r = await fetch(`${API_BASE}/api/devices`, { cache: "no-store" })
  if (!r.ok) throw new Error(`GET /api/devices ${r.status}`)

  return forceArray(await r.json()) as Device[]
}

// Legacy name expected by App.tsx
export async function fetchDevices(): Promise<DeviceInfo[]> {
  return getDevices()
}

// ---------------------------------------------------------
//  POST /api/mode/:mode
// ---------------------------------------------------------
export async function switchMode(mode: SystemMode) {
  const r = await fetch(`${API_BASE}/api/mode/${mode}`, { method: "POST" })
  if (!r.ok) throw new Error(`POST /api/mode/${mode} ${r.status}`)
  return r.json()
}

// ---------------------------------------------------------
//  Device Target Count
// ---------------------------------------------------------
export async function setTarget(count: number) {
  const r = await fetch(`${API_BASE}/api/target`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  })
  if (!r.ok) throw new Error(`POST /api/target ${r.status}`)
  return r.json()
}

export async function getTarget(): Promise<{ count: number }> {
  const r = await fetch(`${API_BASE}/api/target`)
  if (!r.ok) throw new Error(`GET /api/target ${r.status}`)
  return r.json()
}

// ---------------------------------------------------------
//  Sessions (not directly used by App.tsx right now)
// ---------------------------------------------------------
export async function startSession(payload: {
  runner?: string
  mode: SystemMode
  note?: string
}) {
  const r = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`POST /api/sessions ${r.status}`)

  return (await r.json()) as { ok: boolean; session_id: number }
}

// ---------------------------------------------------------
//  Timestamp Collection
// ---------------------------------------------------------
export async function addTimestamp(payload: {
  session_id: number
  device_id: string
  key?: string
}) {
  const r = await fetch(`${API_BASE}/api/timestamps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`POST /api/timestamps ${r.status}`)
  return r.json()
}

export async function listTimestamps(session_id: number) {
  const r = await fetch(`${API_BASE}/api/timestamps?session_id=${session_id}`)
  if (!r.ok) throw new Error(`GET /api/timestamps ${r.status}`)
  return forceArray(await r.json())
}

// ---------------------------------------------------------
//  Runs API — used by Saved Runs in App.tsx
//  NOTE: expects backend routes:
//    GET  /api/runs
//    POST /api/runs
// ---------------------------------------------------------

export async function fetchRuns(): Promise<RunSummary[]> {
  const r = await fetch(`${API_BASE}/api/runs`)
  if (!r.ok) throw new Error(`GET /api/runs ${r.status}`)
  return forceArray(await r.json()) as RunSummary[]
}

export async function saveRun(payload: {
  runner: string
  mode: SystemMode
  stamps: RunStampPayload[]
}): Promise<RunSummary> {
  const r = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`POST /api/runs ${r.status}`)
  return (await r.json()) as RunSummary
}

// ---------------------------------------------------------
//  WebSocket — live events (timestamps, logs, device updates)
// ---------------------------------------------------------

export function openEventSocket(onBatch: (items: EventItem[]) => void) {
  const ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log("[WS] connected:", WS_URL)
    // keepalive ping
    const iv = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping")
      else clearInterval(iv)
    }, 15000)
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg?.type === "events" && Array.isArray(msg.data)) {
        onBatch(msg.data)
      }
    } catch (err) {
      console.warn("[WS] parse error", err)
    }
  }

  ws.onclose = () => console.warn("[WS] closed")
  ws.onerror = (e) => console.error("[WS] error", e)

  return ws
}

// Legacy name expected by App.tsx
export function connectEventStream(onEvents: (events: any[]) => void) {
  return openEventSocket(onEvents)
}