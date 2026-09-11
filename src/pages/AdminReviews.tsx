import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function AdminReviews() {
  const [reviews,setReviews] = useState<any[]>([])
  const [error,setError] = useState('')
  const [busy,setBusy] = useState('')
  async function refresh() { const result = await supabase.from('customer_reviews').select('*').order('created_at',{ascending:false}); if(result.error)setError(result.error.message);else {setReviews(result.data || []);setError('')} }
  useEffect(()=>{void refresh().catch(()=>setError('Unable to load reviews.'))},[])
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Customer reviews</h1><p>Reviews come from completed orders. Approve a review to show it on the homepage.</p>{error && <p role="alert">{error}</p>}{!reviews.length && <p>No customer reviews yet.</p>}{reviews.map(review=><article className="card-premium p-6 space-y-4" key={review.id}><div className="flex justify-between gap-4"><strong>{review.name} · {review.rating}/5</strong><span>{review.approved?'Published':'Awaiting review'}</span></div><p>{review.review}</p><p className="text-sm text-accent/60 break-all">Order: {review.order_number}</p><button className="btn-secondary" disabled={busy===review.id} onClick={async()=>{setBusy(review.id);try{const result=await supabase.from('customer_reviews').update({approved:!review.approved}).eq('id',review.id);if(result.error)throw result.error;await refresh()}catch{setError('Unable to update this review.')}finally{setBusy('')}}}>{review.approved?'Unpublish':'Approve and publish'}</button></article>)}</div>
}
