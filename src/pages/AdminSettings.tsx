import { useState } from 'react'
import { useRestaurantStore } from '../store/useRestaurantData'
export default function AdminSettings() {
  const { catalog, revision, publish, error: loadError } = useRestaurantStore()
  const [draft, setDraft] = useState({ ...catalog.restaurantSettings })
  const [baseRevision, setBaseRevision] = useState(revision)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const textFields = { name: 'Restaurant name', tagline: 'Tagline', phone: 'Phone number', whatsapp_number: 'WhatsApp number (country code + number)', email: 'Email', address: 'Address', google_maps_url: 'Directions URL', instagram_url: 'Instagram URL' }
  const numberFields = { delivery_fee: 'Delivery fee (₹)', free_delivery_above: 'Free delivery above (₹)', tax_percentage: 'Tax (%)', min_order_value: 'Minimum order (₹)', preparation_minutes: 'Estimated preparation (minutes)' }
  const summaryCards = [
    { label: 'Status', value: 'Published' },
    { label: 'Revision', value: String(revision) },
    { label: 'Storefront', value: 'Live' },
  ]

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header className="card-premium overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">Restaurant admin</p>
            <h1 className="section-title mt-2">Restaurant settings</h1>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              setDraft({ ...catalog.restaurantSettings })
              setBaseRevision(revision)
              setMessage('Latest settings loaded.')
            }}
          >
            Load latest settings
          </button>
        </div>

        <p className="mt-4 text-sm text-white/70">
          Publish contact details, opening hours, and ordering rules to the storefront and checkout flow.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">{item.label}</p>
              <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      {loadError && <p role="alert">{loadError}</p>}

      <form
        className="card-premium p-5 space-y-6"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setMessage('')
          try {
            if (baseRevision !== useRestaurantStore.getState().revision) throw new Error('The store changed. Load the latest settings before publishing.')
            if ((draft.tax_percentage || 0) > 100) throw new Error('Tax must be between 0 and 100%.')
            if (!draft.delivery_available && !draft.pickup_available && draft.online_ordering_enabled) throw new Error('Enable delivery or pickup before turning ordering on.')
            const opening_hours_label = draft.opening_hours.map((day: any) => day.day.slice(0, 3) + ' ' + day.open + '–' + day.close).join(' · ')
            await publish('restaurantSettings', { ...draft, opening_hours_label })
            setBaseRevision(useRestaurantStore.getState().revision)
            setMessage('Settings published to the storefront and checkout.')
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to publish settings.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Store details</h2>
          <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
            Live updates
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {Object.entries(textFields).map(([key, label]) => (
            <label className="grid gap-2" key={key}>
              {label}
              <input
                className="admin-input"
                required={['name', 'phone', 'address'].includes(key)}
                type={key === 'email' ? 'email' : 'text'}
                value={String((draft as any)[key] || '')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}

          {Object.entries(numberFields).map(([key, label]) => (
            <label className="grid gap-2" key={key}>
              {label}
              <input
                className="admin-input"
                type="number"
                min="0"
                max={key === 'tax_percentage' ? 100 : undefined}
                step=".01"
                required
                value={Number((draft as any)[key] || 0)}
                onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <h3 className="mb-4 text-base font-semibold text-white">Ordering options</h3>
          <div className="flex flex-wrap gap-6">
            {Object.entries({ online_ordering_enabled: 'Accept online orders', delivery_available: 'Delivery available', pickup_available: 'Pickup available' }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={Boolean((draft as any)[key])}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <legend className="mb-3 font-bold text-white">Opening hours</legend>
          <p className="text-sm text-white/60">India time. A closing time earlier than opening keeps the service open overnight.</p>
          {draft.opening_hours.map((day: any, index: number) => (
            <div key={day.day} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr] md:items-center">
              <span className="font-medium text-white/80">{day.day}</span>
              {(['open', 'close'] as const).map((key) => (
                <input
                  key={key}
                  required
                  aria-label={day.day + ' ' + key}
                  className="admin-input"
                  type="time"
                  value={day[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      opening_hours: draft.opening_hours.map((d: any, i: number) =>
                        i === index ? { ...d, [key]: e.target.value } : d,
                      ),
                    })
                  }
                />
              ))}
            </div>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} className="btn-primary">
            {busy ? 'Publishing…' : 'Publish settings'}
          </button>
          <p role="status" className="text-sm text-white/70">{message}</p>
        </div>
      </form>
    </div>
  )
}
