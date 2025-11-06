import React from 'react'
export default function DeviceCard({name,ip,signal,lastSeen,online}:{name:string,ip:string,signal:number,lastSeen:string,online:boolean}){
  return (
    <div className="card">
      <div className="flex justify-between">
        <div className="text-lg font-semibold">{name}</div>
        <span className={`badge ${online?'badge-green':'badge-amber'}`}>{online?'Online':'Offline'}</span>
      </div>
      <div className="mt-3 text-sm opacity-80">IP Address</div>
      <div className="font-mono">{ip}</div>
      <div className="mt-3 text-sm opacity-80">Signal</div>
      <div className="w-full h-2 bg-neutral-700 rounded"><div className="h-2 bg-green-500 rounded" style={{width:`${signal}%`}}/></div>
      <div className="mt-3 text-sm opacity-80">Last Seen</div>
      <div className="font-mono">{lastSeen}</div>
    </div>
  )
}
