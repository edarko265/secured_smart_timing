import React from 'react'
export default function ArchitectureToggle({mode,setMode}:{mode:'centralized'|'decentralized', setMode:(m:any)=>void}){
  return (
    <div className="card flex gap-3">
      <button onClick={()=>setMode('centralized')} className={`px-4 py-2 rounded-xl ${mode==='centralized'?'bg-blue-600':'bg-neutral-700'}`}>Centralized</button>
      <button onClick={()=>setMode('decentralized')} className={`px-4 py-2 rounded-xl ${mode==='decentralized'?'bg-blue-600':'bg-neutral-700'}`}>Decentralized</button>
    </div>
  )
}
