import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PushSendLogs(){
  const [logs,setLogs]=useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [orderFilter,setOrderFilter]=useState('')
  const [statusFilter,setStatusFilter]=useState('')
  const [limit,setLimit]=useState(50)
  const [page,setPage]=useState(0)

  useEffect(()=>{void load()},[orderFilter,statusFilter,limit,page])
  const load=async()=>{
    setLoading(true)
    try{
      let q = supabase.from('push_send_logs').select('id,order_number,subscription_id,endpoint,status,error,created_at')
        .order('created_at',{ascending:false}).limit(limit).offset(page*limit)
      if(orderFilter) q = q.eq('order_number', orderFilter)
      if(statusFilter) q = q.eq('status', statusFilter)
      const { data, error } = await q
      if(error) throw error
      setLogs(data||[])
    }catch(e){console.error(e)}finally{setLoading(false)}
  }

  return <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold">Push send logs</h3>
      <div className="flex items-center gap-2">
        <input placeholder="Order number" className="admin-input" value={orderFilter} onChange={e=>{setPage(0); setOrderFilter(e.target.value)}} />
        <select className="admin-input" value={statusFilter} onChange={e=>{setPage(0); setStatusFilter(e.target.value)}}>
          <option value="">(any)</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
          <option value="removed">removed</option>
        </select>
        <button className="btn-secondary" onClick={()=>{ setPage(0); void load() }}>Refresh</button>
        <button className="btn-secondary" onClick={()=>{
          if(!logs || !logs.length) return
          const headers = ['id','order_number','subscription_id','endpoint','status','error','created_at']
          const rows = logs.map(r=>headers.map(h=>{
            const v = r[h]
            if(v === null || v === undefined) return ''
            return String(v).replace(/"/g,'""')
          }).map(cell=>`"${cell}"`).join(','))
          const csv = headers.join(',') + '\n' + rows.join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `push_send_logs_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }}>Export CSV</button>
      </div>
    </div>
    {loading? <p>Loading…</p> : (
      <div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>ID</th><th>Order</th><th>Status</th><th>Error</th><th>At</th></tr></thead>
            <tbody>
              {logs.map(l=> <tr key={l.id}><td className="pr-3">{l.id}</td><td className="pr-3">{l.order_number||'—'}</td><td className="pr-3">{l.status}</td><td className="pr-3 break-words max-w-xs">{l.error||'—'}</td><td className="pr-3">{new Date(l.created_at).toLocaleString()}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <label className="text-sm">Rows: </label>
            <select value={limit} onChange={e=>{setLimit(Number(e.target.value)); setPage(0)}} className="admin-input">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button>
            <span>Page {page+1}</span>
            <button className="btn-secondary" onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>
    )}
  </div>
}
