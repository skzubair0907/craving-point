import { Link } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'
import useTheme from '../hooks/useTheme'
import './Footer.css'

const links = [['Menu','/menu'],['About','/#about'],['The Grill','/#grill'],['Gifting','/#gifting'],['Visit','/#location']]
export default function Footer() {
  const { restaurantSettings: settings } = useRestaurantData()
  const { theme, toggleTheme } = useTheme()
  const phone = settings.phone || '+917021235530'
  return <footer className="reference-footer">
    <div className="reference-footer-shell">
      <div className="reference-footer-top">
        <div className="reference-footer-intro">
          <Link to="/" aria-label="Craving Point home"><img src="/images/logo-generated.svg" alt="Craving Point" width="180" height="72" loading="lazy" /></Link>
          <p>Waffles, loaded tubs<br />and charcoal wraps<br />in Cheeta Camp,<br />Trombay. Made when<br />you ask, not before.</p>
        </div>
        <nav aria-label="Footer explore" className="reference-footer-column"><h2>Explore</h2>{links.map(([label,to]) => <Link key={to} to={to}>{label}</Link>)}</nav>
        <div className="reference-footer-column"><h2>Connect</h2><a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a><a href={'https://wa.me/' + (settings.whatsapp_number || phone).replace(/\D/g,'')} target="_blank" rel="noreferrer">WhatsApp</a><a href={'tel:' + phone.replace(/[^+\d]/g,'')}>{phone}</a></div>
      </div>
      <div className="reference-footer-wordmark" aria-hidden="true">Craving Point<span>.88</span></div>
      <div className="reference-footer-bottom">
        <small>{'\u00a9'} {new Date().getFullYear()} Craving Point .88. All rights reserved. <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></small>
        <div className="reference-footer-controls"><div className="reference-footer-theme" role="group" aria-label="Color theme">{(['light','dark'] as const).map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => { if (theme !== value) toggleTheme() }}>{value}</button>)}</div><button className="reference-footer-top-button" type="button" onClick={() => window.scrollTo({ top:0, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>Back to top <ArrowUp size={12}/></button></div>
      </div>
    </div>
  </footer>
}
