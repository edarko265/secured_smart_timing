import React from 'react'
export default function StatusBanner({active,total}:{active:number,total:number}){
  const ok = active===total && total>0
  return (
    <div className="card border border-green-700/30">
      <div className={`text-xl font-semibold ${ok?'text-green-400':'text-amber-300'}`}>
        { ok? 'ALL SYSTEMS GO' : 'ATTENTION REQUIRED' }
      </div>
      <div className="opacity-80">All devices secure and operational</div>
      <div className="mt-4 text-3xl"><span className="font-bold">{active}</span> / {total}</div>
    </div>
  )
}
