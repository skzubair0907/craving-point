import React, { useEffect, useRef, useState } from 'react'

type Props = { orderNumber: string; onClose: () => void; onConfirm: (reason: string) => void }

export default function ForceDeliverDialog({ orderNumber, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (closeRef?.current) closeRef.current.focus() }, [])
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5" role="presentation">
      <button className="absolute inset-0 bg-black/75" aria-label="Close" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="force-deliver-title" className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[var(--brand-surface)] p-6 sm:p-8 shadow-2xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-red-300">FORCE DELIVER</p>
            <h2 id="force-deliver-title" className="mt-1 text-2xl font-bold">Force mark delivered</h2>
          </div>
          <button ref={closeRef} type="button" className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Close" onClick={onClose}>✕</button>
        </header>

        <div className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm space-y-1">
          <p className="font-bold">{orderNumber}</p>
          <p className="text-accent/70">Force this delivery to the 'delivered' state. This bypasses rider OTP confirmation.</p>
        </div>

        <form className="space-y-4" onSubmit={event => { event.preventDefault(); setBusy(true); onConfirm(reason.trim()); setBusy(false) }}>
          <label className="grid gap-2 font-medium">Admin reason<textarea className="admin-input min-h-28" value={reason} onChange={(event) => setReason((event.target as HTMLTextAreaElement).value)} minLength={3} maxLength={1000} required placeholder="Reason for forcing delivery (required)" /></label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy || reason.trim().length < 3}>{busy ? 'Submitting…' : 'Force deliver'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
