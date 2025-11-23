import React, { useEffect, useState, useCallback } from "react"
import {
  DeviceInfo,
  SystemMode,
  fetchDevices,
  switchMode,
  connectEventStream,
  saveRun,
  fetchRuns,
  RunSummary,
  RunStampPayload,
} from "./api"
import "./styles.css"

interface LiveStamp {
  tsIso: string
  deviceId: string
  deviceLabel: string
}

const REFRESH_MS = 1_000 // 1s polling feels more "live"

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour12: false })
}

function formatMaybeTime(raw: any): string {
  if (!raw) return "-"
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(raw)
  return formatTime(d)
}

function App() {
  const [mode, setMode] = useState<SystemMode>("centralized")
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [targetDevices, setTargetDevices] = useState<number>(2)
  const [runner, setRunner] = useState<string>("eric")
  const [sessionId, setSessionId] = useState<number>(1)
  const [liveStamps, setLiveStamps] = useState<LiveStamp[]>([])
  const [savedRuns, setSavedRuns] = useState<RunSummary[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [nextIndex, setNextIndex] = useState<number>(0)

  // -------- device refresh helper ------------------------------------------

  const refreshDevices = useCallback(async () => {
    try {
      const devs = await fetchDevices()
      // If backend includes offline devices, you can filter here:
      // const online = devs.filter(d => d.status !== "offline")
      setDevices(devs)
    } catch (err) {
      console.error("device refresh error", err)
    }
  }, [])

  // -------- polling devices -------------------------------------------------

  useEffect(() => {
    let alive = true

    const tick = async () => {
      if (!alive) return
      await refreshDevices()
    }

    // immediate fetch + interval
    tick()
    const id = setInterval(tick, REFRESH_MS)

    return () => {
      alive = false
      clearInterval(id)
    }
  }, [refreshDevices])

  // -------- event stream ----------------------------------------------------

  useEffect(() => {
    const ws = connectEventStream((newEvents) => {
      console.debug("[WS] batch:", newEvents)
      setEvents((prev) => [...newEvents, ...prev].slice(0, 50))

      // Every time we get events from the server, re-pull device list.
      // This makes new/removed cones show up almost instantly.
      refreshDevices()
    })
    return () => ws.close()
  }, [refreshDevices])

  // -------- saved runs initial load ----------------------------------------

  useEffect(() => {
    fetchRuns()
      .then((runs) => {
        console.debug("[API] runs:", runs)
        setSavedRuns(runs)
      })
      .catch((err) => console.error("fetchRuns error", err))
  }, [])

  // -------- stamping logic --------------------------------------------------

  const performStamp = useCallback(
    (index: number) => {
      const devList = devices.slice(0, targetDevices)
      if (!devList[index]) return
      const d = devList[index]

      const tsIso = new Date().toISOString()
      const label = `${index + 1}. ${d.id}`
      const stamp: LiveStamp = {
        tsIso,
        deviceId: d.id,
        deviceLabel: label,
      }

      setLiveStamps((prev) => [...prev, stamp])
    },
    [devices, targetDevices]
  )

  // keyboard handler: 1–9 or Space
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return

      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1
        performStamp(idx)
        return
      }

      if (e.key === " ") {
        e.preventDefault()
        const usable = Math.min(targetDevices, devices.length)
        if (usable === 0) return
        const idx = nextIndex % usable
        performStamp(idx)
        setNextIndex((prev) => (prev + 1) % usable)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [performStamp, devices.length, nextIndex, targetDevices])

  // -------- mode toggle -----------------------------------------------------

  const handleModeChange = async (newMode: SystemMode) => {
    if (newMode === mode) return
    try {
      await switchMode(newMode)
      setMode(newMode)
      setLiveStamps([])
      setNextIndex(0)
      setSessionId((s) => s + 1)
      // Refresh devices when switching mode as well
      refreshDevices()
    } catch (err) {
      console.error("switchMode error", err)
    }
  }

  // -------- save / discard --------------------------------------------------

  const handleDiscard = () => {
    setLiveStamps([])
    setNextIndex(0)
  }

  const handleSave = async () => {
    if (!liveStamps.length) return

    const payloadStamps: RunStampPayload[] = liveStamps.map((s) => ({
      device_id: s.deviceId,
      device_label: s.deviceLabel,
      ts_iso: s.tsIso,
    }))

    try {
      const run = await saveRun({
        runner: runner || "Unknown",
        mode,
        stamps: payloadStamps,
      })

      setLiveStamps([])
      setNextIndex(0)
      setSessionId((s) => s + 1)

      setSavedRuns((prev) => [run, ...prev])
    } catch (err) {
      console.error("saveRun error", err)
    }
  }

  const connectedCount = devices.length

  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100">
      <header className="border-b border-[color:var(--line-color)]/60 bg-[#020617]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Secure Timing Ethos</h1>
            <p className="text-xs text-gray-400">
              ESP32 training cones •{" "}
              {mode === "centralized" ? "Centralized (TCP)" : "Decentralized (UDP/mesh)"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full bg-[#020617] p-1 border border-[color:var(--line-color)]/60">
              <button
                className={`px-4 py-1 text-xs rounded-full transition ${
                  mode === "centralized" ? "bg-blue-600 text-white" : "text-gray-400"
                }`}
                onClick={() => handleModeChange("centralized")}
              >
                Centralized
              </button>
              <button
                className={`px-4 py-1 text-xs rounded-full transition ${
                  mode === "decentralized" ? "bg-blue-600 text-white" : "text-gray-400"
                }`}
                onClick={() => handleModeChange("decentralized")}
              >
                Decentralized
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Top row: discovery / runner / status */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Discovery */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Discovery</h2>
              <span className="chip chip-green text-xs">
                {connectedCount} / {targetDevices} connected
              </span>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="flex items-center gap-3">
                <span className="w-20 text-gray-400">Target</span>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={targetDevices}
                  onChange={(e) =>
                    setTargetDevices(
                      Math.max(1, Math.min(9, Number(e.target.value) || 1))
                    )
                  }
                  className="w-20 rounded-md bg-black/40 border border-[color:var(--line-color)] px-2 py-1 text-xs"
                />
                <button
                  className="ml-auto px-4 py-1 rounded-md bg-blue-600 text-xs font-medium hover:bg-blue-500 transition"
                  onClick={() => {
                    setNextIndex(0)
                    setLiveStamps([])
                  }}
                >
                  Start Discovery
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Press keys <span className="font-mono">1…9</span> to stamp by cone index, or{" "}
                <span className="font-mono">Space</span> to stamp sequentially across connected
                cones.
              </p>
            </div>
          </section>

          {/* Runner + Session */}
          <section className="card">
            <h2 className="text-sm font-semibold mb-3">Runner &amp; Session</h2>
            <div className="space-y-3 text-xs text-gray-300">
              <label className="flex items-center gap-3">
                <span className="w-20 text-gray-400">Runner</span>
                <input
                  value={runner}
                  onChange={(e) => setRunner(e.target.value)}
                  className="flex-1 rounded-md bg-black/40 border border-[color:var(--line-color)] px-2 py-1 text-xs"
                  placeholder="Runner name"
                />
              </label>
              <div className="flex items-center justify-between">
                <div className="text-gray-400 text-[11px]">
                  Session <span className="font-mono text-gray-100">#{sessionId}</span>
                </div>
                <button
                  onClick={() => {
                    setSessionId((s) => s + 1)
                    setLiveStamps([])
                    setNextIndex(0)
                  }}
                  className="px-3 py-1 rounded-md border border-[color:var(--line-color)] text-[11px] hover:bg-white/5"
                >
                  New session
                </button>
              </div>
            </div>
          </section>

          {/* Status */}
          <section className="card">
            <h2 className="text-sm font-semibold mb-3">Status</h2>
            <div className="space-y-1 text-xs text-gray-300">
              <p>
                Mode: <span className="font-mono text-gray-100">{mode}</span>
              </p>
              <p>
                Devices:{" "}
                <span className="font-mono text-gray-100">
                  {connectedCount} / {targetDevices}
                </span>
              </p>
              <p className="text-[11px] text-gray-500">
                Live timestamps:{" "}
                <span className="font-mono text-gray-100">{liveStamps.length}</span>
              </p>
            </div>
          </section>
        </div>

        {/* Devices + timestamps + events */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="text-sm font-semibold mb-3">Devices</h2>
            {devices.length === 0 ? (
              <p className="text-xs text-gray-400">No devices detected yet.</p>
            ) : (
              <div className="space-y-2">
                {devices.slice(0, targetDevices).map((d, idx) => (
                  <div
                    key={d.id}
                    className="rounded-xl bg-[#020617] border border-[color:var(--line-color)]/60 px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium">
                        {idx + 1}. {d.id}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {d.ip ?? "no-ip"} • RSSI {d.rssi ?? d.signal ?? "-"} dBm
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip chip-green text-[11px]">online</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live timestamps + save / discard */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Timestamps (live)</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  disabled={!liveStamps.length}
                  className={`px-3 py-1 rounded-md border text-[11px] ${
                    liveStamps.length
                      ? "border-[color:var(--line-color)] hover:bg-white/5"
                      : "border-[color:var(--line-color)]/40 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={!liveStamps.length}
                  className={`px-3 py-1 rounded-md text-[11px] ${
                    liveStamps.length
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-emerald-900/40 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Save run
                </button>
              </div>
            </div>

            {liveStamps.length === 0 ? (
              <p className="text-xs text-gray-400">
                No stamps yet. Press <span className="font-mono">1…9</span> or{" "}
                <span className="font-mono">Space</span> to record timestamps.
              </p>
            ) : (
              <div className="border border-[color:var(--line-color)]/60 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="px-3 py-1 text-left w-10">#</th>
                      <th className="px-3 py-1 text-left">Time</th>
                      <th className="px-3 py-1 text-left">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveStamps.map((s, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-[color:var(--line-color)]/40"
                      >
                        <td className="px-3 py-1 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-1 font-mono text-[11px]">
                          {formatTime(new Date(s.tsIso))}
                        </td>
                        <td className="px-3 py-1 text-[11px]">{s.deviceLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Saved runs + event log */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="text-sm font-semibold mb-3">Saved runs</h2>
            {savedRuns.length === 0 ? (
              <p className="text-xs text-gray-400">No runs saved yet.</p>
            ) : (
              <div className="border border-[color:var(--line-color)]/60 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg:white/5 bg-white/5 text-gray-400">
                    <tr>
                      <th className="px-3 py-1 text-left">Time</th>
                      <th className="px-3 py-1 text-left">Runner</th>
                      <th className="px-3 py-1 text-left">Mode</th>
                      <th className="px-3 py-1 text-left">Cone 1</th>
                      <th className="px-3 py-1 text-left">Cone 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedRuns.map((r: any) => {
                      const created =
                        r.created_at ?? r.created ?? r.time ?? r.timestamp ?? null
                      const mode = r.mode ?? r.system_mode ?? r.architecture ?? "-"
                      const cone1Id = r.cone1_id ?? r.cone_1_id ?? r.first_cone_id
                      const cone1Ts =
                        r.cone1_ts ?? r.cone_1_ts ?? r.first_cone_ts ?? null
                      const cone2Id = r.cone2_id ?? r.cone_2_id ?? r.second_cone_id
                      const cone2Ts =
                        r.cone2_ts ?? r.cone_2_ts ?? r.second_cone_ts ?? null

                      return (
                        <tr
                          key={r.id}
                          className="border-t border-[color:var(--line-color)]/40"
                        >
                          <td className="px-3 py-1 font-mono text-[11px]">
                            {formatMaybeTime(created)}
                          </td>
                          <td className="px-3 py-1 text-[11px]">
                            {r.runner ?? r.runner_name ?? "-"}
                          </td>
                          <td className="px-3 py-1 text-[11px]">{mode}</td>
                          <td className="px-3 py-1 text-[11px]">
                            {cone1Id
                              ? `${cone1Id} @ ${formatMaybeTime(cone1Ts)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-1 text-[11px]">
                            {cone2Id
                              ? `${cone2Id} @ ${formatMaybeTime(cone2Ts)}`
                              : "-"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Event log</h2>
              <span className="text-[11px] text-gray-500">latest {events.length}</span>
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-gray-400">No events yet.</p>
            ) : (
              <div className="max-h-64 overflow-auto pr-1 space-y-1 text-[11px]">
                {events.map((e: any, idx) => {
                  const ts = e.ts ?? e.time ?? e.timestamp ?? ""
                  const device = e.device ?? e.device_id ?? e.id ?? ""
                  const message =
                    e.message ??
                    e.msg ??
                    e.event ??
                    e.text ??
                    JSON.stringify(e)

                  return (
                    <div
                      key={idx}
                      className="rounded-md bg-[#020617] border border-[color:var(--line-color)]/40 px-2 py-1"
                    >
                      <span className="font-mono text-gray-500 mr-2">
                        {ts ? ts.slice(11, 19) : ""}
                      </span>
                      {device && (
                        <span className="text-gray-300 mr-2">{device}</span>
                      )}
                      <span className="text-gray-400">{message}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
