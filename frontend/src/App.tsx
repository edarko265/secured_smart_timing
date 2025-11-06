// App.tsx
import React, {useEffect, useMemo, useState} from 'react'
import { getDevices, connectEvents, setMode } from './api'
import StatusBanner from './components/StatusBanner'
import DeviceCard from './components/DeviceCard'
import ArchitectureToggle from './components/ArchitectureToggle'
import CommandPanel from './components/CommandPanel'
import EventLog from './components/EventLog'

type Mode = 'centralized'|'decentralized'

export default function App(){
  const [mode,setModeState]=useState<Mode>('centralized')
  const [devices,setDevices]=useState<Record<string,any>>({})
  const [events,setEvents]=useState<any[]>([])
  const [selected, setSelected] = useState('CONE_A')

  useEffect(()=>{ // start events socket
    const ws = connectEvents((batch)=> setEvents(curr=>[...batch,...curr].slice(0,500)))
    return ()=>ws.close()
  },[])

  useEffect(()=>{ // poll devices every 1s
    const t = setInterval(async()=> setDevices(await getDevices()), 1000)
    return ()=>clearInterval(t)
  },[])

  const stats = useMemo(()=>{
    const now=Date.now()
    const list=Object.entries(devices)
    const total=list.length
    const active=list.filter(([_,d])=> now - new Date(d.last_seen).getTime() < 15000).length
    return {active,total}
  },[devices])

  const onToggle = async (m:Mode)=>{ setModeState(m); await setMode(m) }

  // keyboard timestamps (Space → selected cone; 1..4 → A..D)
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(e.key===' ') {
        fetch('/api/mode/centralized',{method:'GET'}) // noop to keep session warm
        // We log from backend when ESPs send or from terminal; for UI-only tests you can POST events if needed
      }
      if(['1','2','3','4'].includes(e.key)){ setSelected({1:'CONE_A',2:'CONE_B',3:'CONE_C',4:'CONE_D'}[e.key as '1'|'2'|'3'|'4']!) }
    }
    window.addEventListener('keydown', handler); return ()=>window.removeEventListener('keydown', handler)
  },[])

  return (
  <div className="p-6 space-y-6">
    <div className="flex justify-between">
      <div>
        <div className="text-2xl font-bold">Smart Timing Cone System</div>
        <div className="opacity-70">IoT Security Monitoring Dashboard</div>
      </div>
      <div className="opacity-70 text-right">
        Thesis Project - Savonia UAS<br/>Cybersecurity Protocols for Decentralized IoT
      </div>
    </div>

    <StatusBanner active={stats.active} total={stats.total} />

    <div className="grid grid-cols-3 gap-4">
      {Object.entries(devices).map(([cone,d])=>{
        const online = Date.now()-new Date(d.last_seen).getTime() < 15000
        const pct = Math.max(0, Math.min(100, Math.round((d.rssi+90)*2)))
        return <DeviceCard key={cone} name={cone} ip={d.ip} signal={pct} lastSeen={new Date(d.last_seen).toLocaleString()} online={online} />
      })}
    </div>

    <ArchitectureToggle mode={mode} setMode={onToggle} />

    <div className="grid grid-cols-2 gap-4">
      <CommandPanel />
      <EventLog items={events} />
    </div>
  </div>)
}
