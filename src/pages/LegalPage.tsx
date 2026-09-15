type LegalPageProps = { kind: 'privacy' | 'terms' }

export default function LegalPage({ kind }: LegalPageProps) {
  const privacy = kind === 'privacy'
  const title = privacy ? 'Privacy Policy' : 'Terms of Service'

  return <main className="mx-auto max-w-3xl px-5 py-16 text-[var(--brand-cream)] sm:py-24">
    <p className="small-label text-[var(--cp-primary)]">CRAVING POINT .88</p>
    <h1 className="mt-4 font-[var(--font-display)] text-6xl uppercase leading-none sm:text-7xl">{title}</h1>
    <p className="mt-5 text-sm text-[var(--brand-cream-soft)]">Last updated: September 15, 2026</p>
    {privacy ? <div className="mt-10 space-y-8 text-sm leading-7 text-[var(--brand-cream-soft)]">
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Information we collect</h2><p>When you place an order, we collect the information needed to prepare and deliver it, such as your name, phone number, delivery address, order details and payment status. If you choose to sign in, your Google account supplies your name and email address.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">How we use it</h2><p>We use your information to process orders, provide delivery updates, respond to support requests, prevent misuse and improve our restaurant service. We do not sell personal information.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Storage and sharing</h2><p>Order and account information is stored in our service providers, including Supabase. We share only the information required to fulfill an order, such as delivery details with the assigned delivery person.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Your choices</h2><p>You may ask us to correct or delete your customer information, subject to legal and operational record-keeping requirements. Contact us using the restaurant phone number or WhatsApp link on this website.</p></section>
    </div> : <div className="mt-10 space-y-8 text-sm leading-7 text-[var(--brand-cream-soft)]">
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Orders</h2><p>Submitting an order is a request to purchase food from Craving Point .88. We may contact you to confirm availability, delivery coverage, preparation time or substitutions before accepting an order.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Prices and payments</h2><p>Prices, taxes, delivery fees and availability can change. The final amount shown during checkout or confirmed by our staff applies to your order.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Cancellations and refunds</h2><p>Please contact us as soon as possible if you need to cancel an order. A cancellation or refund depends on whether food preparation or delivery has started.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold text-[var(--brand-cream)]">Use of this website</h2><p>Please provide accurate details and use this website lawfully. We may update these terms when our service changes.</p></section>
    </div>}
  </main>
}
