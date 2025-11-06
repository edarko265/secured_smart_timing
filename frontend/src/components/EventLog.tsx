import React from 'react'
export default function EventLog({items}:{items:any[]}) {
  const color = (s:string)=> s==='success'?'text-green-300': s==='warning'?'text-amber-300': s==='error'?'text-red-300':'text-blue-300'
  return (
    <div className="card">
      <div className="text-lg font-semibold mb-3">Security Event Log</div>
      <div className="space-y-2">
        {items.slice(0,60).map((e,i)=>(
          <div key={i} className={`p-3 rounded bg-neutral-800/60 border-l-4 ${e.severity==='success'?'border-green-500':e.severity==='warning'?'border-amber-500':e.severity==='error'?'border-red-500':'border-blue-500'}`}>
            <div className="text-xs opacity-70">{e.ts}</div>
            <div className={`text-sm ${color(e.severity)}`}><b className="mr-2">{e.cone_id}</b>{e.msg}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
