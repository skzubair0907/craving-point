import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeliveryAuditBrowser({ defaultOrder }:{defaultOrder?:string}){
  const [orderNumber,setOrderNumber]=useState(defaultOrder||'')
  const [rows,setRows]=useState<Array<any>>([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string| null>(null)
  const [limit,setLimit]=useState(200)

  const load=async()=>{
    if(!supabase) return
    setLoading(true);setError(null)
    try{
      let q = supabase.from('delivery_tracking_audit').select('id,order_number,latitude,longitude,accuracy,updated_at,updated_by').order('updated_at',{ascending:false}).limit(limit)
      if(orderNumber) q = q.eq('order_number',orderNumber)
      const res = await q
      if(res.error) throw res.error
      setRows(res.data||[])
    }catch(e:any){setError(e?.message||'Unable to load audit rows')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[limit])

  const exportCsv=()=>{
    const csv = ['id,order_number,latitude,longitude,accuracy,updated_at,updated_by', ...rows.map(r=>[r.id,r.order_number,r.latitude,r.longitude,r.accuracy,r.updated_at,r.updated_by].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url;a.download=`delivery_audit_${orderNumber||'all'}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Delivery audit browser</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm">Rows</label>
          <select className="admin-input" value={String(limit)} onChange={e=>setLimit(Number(e.target.value))}><option value={50}>50</option><option value={200}>200</option><option value={1000}>1000</option></select>
          <button className="btn-secondary" onClick={()=>void load()}>Refresh</button>
          <button className="btn-secondary" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input className="admin-input flex-1" placeholder="Order number (optional)" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} />
        <button className="btn-primary" onClick={()=>void load()}>Search</button>
      </div>

      {loading && <p className="text-sm mt-2">Loading…</p>}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      <div className="mt-3 max-h-64 overflow-auto text-sm">
        <table className="w-full table-fixed">
          <thead><tr className="text-left"><th className="w-20">ID</th><th>Order</th><th>Lat</th><th>Lng</th><th className="w-24">Acc</th><th className="w-48">Updated at</th><th className="w-40">By</th></tr></thead>
          <tbody>
            {rows.map((r:any)=> (
              <tr key={r.id} className="border-t border-white/5"><td className="py-1">{r.id}</td><td className="py-1 font-mono text-xs">{r.order_number}</td><td className="py-1">{Number(r.latitude).toFixed(6)}</td><td className="py-1">{Number(r.longitude).toFixed(6)}</td><td className="py-1">{r.accuracy}</td><td className="py-1">{new Date(r.updated_at).toLocaleString()}</td><td className="py-1">{r.updated_by}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
