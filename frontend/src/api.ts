export const API = '/api'
export type Device = { ip:string, rssi:number, last_seen:string, mode:string }
export async function getDevices(): Promise<Record<string,Device>>{
  const r = await fetch(`${API}/devices`); return r.json()
}
export async function setMode(mode:'centralized'|'decentralized'){
  await fetch(`${API}/mode/${mode}`,{method:'POST'})
}
export function connectEvents(onBatch:(items:any[])=>void){
  const ws = new WebSocket(`ws://${location.host}/ws/events`)
  ws.onopen=()=>ws.send('ping')
  ws.onmessage=(ev)=>{ const p=JSON.parse(ev.data); if(p.type==='events') onBatch(p.data); ws.send('ping') }
  return ws
}
