import React, {useState} from 'react'
export default function CommandPanel(){
  const [log,setLog]=useState<string[]>(['$ system status'])
  const run = async (cmd:string, endpoint?:string)=>{
    setLog(x=>[`$ ${cmd}`,...x]); // you can wire backend shell endpoints later if needed
  }
  return (
    <div className="card">
      <div className="text-lg font-semibold mb-3">Command Terminal</div>
      <div className="flex gap-2 mb-3">
        <button onClick={()=>run('Scan Network')} className="px-3 py-1 rounded bg-neutral-700">Scan Network</button>
        <button onClick={()=>run('Check TLS')} className="px-3 py-1 rounded bg-neutral-700">Check TLS</button>
        <button onClick={()=>run('Test Authentication')} className="px-3 py-1 rounded bg-neutral-700">Test Authentication</button>
        <button onClick={()=>run('Monitor Traffic')} className="px-3 py-1 rounded bg-neutral-700">Monitor Traffic</button>
        <button onClick={()=>run('Security Audit')} className="px-3 py-1 rounded bg-neutral-700">Security Audit</button>
      </div>
      <div className="font-mono text-sm bg-neutral-900 rounded p-3 h-48 overflow-auto">{log.map((l,i)=><div key={i}>{l}</div>)}</div>
    </div>
  )
}
