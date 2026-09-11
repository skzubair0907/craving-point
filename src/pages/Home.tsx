import { useState } from 'react'
import { useLoopingVideo } from '../hooks/useLoopingVideo'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDown, Pause, Play, MapPin, Instagram } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'
import { useRestaurantStatus } from '../hooks/useRestaurantStatus'
import { useDepth, useQuality } from '../hooks/useExperience'
import { Reveal } from '../components/EditorialMotion'
import MenuExperience from '../components/MenuExperience'

function GrillFilm() {
  const quality = useQuality()
  const { video, playing, toggle } = useLoopingVideo(quality !== 'low')
  return <div className="grill-film">
    <video ref={video} src="/shawarma.mp4" poster="/images/shawarma-poster.jpg" preload="metadata" playsInline loop muted />
    {!playing && <button className="film-play" onClick={toggle} aria-label="Play the shawarma film"><Play fill="currentColor" size={26}/><span>THE SHAWARMA FILM</span></button>}
    {playing && <button className="grill-pause" onClick={toggle} aria-label="Pause the shawarma film"><Pause size={16}/> PAUSE FILM</button>}
  </div>
}

export default function Home() {
  const { restaurantSettings: settings } = useRestaurantData()
  const status = useRestaurantStatus()
  const depth = useDepth<HTMLElement>()
  const magnetic = useDepth<HTMLAnchorElement>()
  const quality = useQuality()
  const { video, playing, toggle } = useLoopingVideo(quality !== 'low')
  const [ready, setReady] = useState(false)
  const whatsapp = 'https://wa.me/' + (settings.whatsapp_number || settings.phone).replace(/\D/g, '')
  return <div className="cinematic-home" data-quality={quality}>
    <section className="campaign-hero" ref={depth}>
      <div className="hero-topline"><span>CHEETA CAMP · TROMBAY</span><span>THE DIGITAL FOOD EXPERIENCE</span><span className="hero-status"><i/>{status.isOpen ? 'OPEN FOR YOUR CRAVINGS' : 'SEE YOU AT THE COUNTER'}</span></div>
      <div className="campaign-copy"><p className="small-label">YOUR CRAVINGS. OUR SPECIALTY.</p><h1>CRAVING<br/><span>POINT<sup>.88</sup></span></h1><p className="hero-description">What are you craving today?<br/>Hot shawarma. Loaded bowls. Chocolate everything.</p><div className="hero-actions"><Link ref={magnetic} to="/menu" className="editorial-button magnetic">Find your craving <ArrowUpRight size={20}/></Link><a href={whatsapp} target="_blank" rel="noreferrer" className="text-link">Order on WhatsApp <ArrowUpRight size={16}/></a></div></div>
      <div className="hero-food-layer"><img src="/images/gallery2-1152.webp" srcSet="/images/gallery2-576.webp 576w, /images/gallery2-1152.webp 1152w" sizes="(max-width: 767px) 100vw, 65vw" alt="Ferrero Rocher waffle with chocolate drizzle" fetchPriority="high" width="1152" height="921" onLoad={() => setReady(true)} onError={() => setReady(true)}/>{quality !== 'low' && <video ref={video} className={playing ? 'hero-film is-playing' : 'hero-film'} src="/videos/hero.mp4" poster="/images/hero-poster.jpg" muted playsInline loop preload="metadata"/>}<span className="food-note">Go on.<br/><em>Give in.</em></span></div>
      <div className="hero-footer"><a href="#about" className="scroll-note"><ArrowDown size={17}/> SCROLL TO DISCOVER</a><span>WAFFLES · BOWLS · SHAWARMA</span>{quality !== 'low' && <button className="film-toggle" onClick={toggle}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'PAUSE FILM' : 'PLAY FOOD FILM'}</button>}</div>
      {!ready && <div className="asset-progress" role="status">PREPARING YOUR CRAVING <span>00</span></div>}
    </section>

    <section id="about" className="editorial-shell story-section">
      <Reveal className="story-copy"><p className="small-label"><span className="red-dash"/> 01 / A TASTE OF OUR WORLD</p><h2>COCOA.<br/>BUTTER.<br/>SALT. <em>FIRE.</em></h2><p>Sweet meets savoury at Craving Point .88. From chocolate-drenched waffles to a warm wrap, find your kind of comfort in Cheeta Camp.</p><Link to="/menu" className="text-link">Find your favourite <ArrowUpRight size={18}/></Link></Reveal>
      <Reveal className="story-image"><img src="/images/gallery4-1152.webp" srcSet="/images/gallery4-576.webp 576w, /images/gallery4-1152.webp 1152w" sizes="(max-width: 767px) 100vw, 65vw" alt="Craving Point chocolate classic bowl" loading="lazy" width="1152" height="921"/><div className="image-caption"><span>CHOCOLATE, FRONT AND CENTRE.</span><span>CP / .88</span></div></Reveal>
    </section>
    <div className="brand-marquee" aria-label="Waffles, chocolate bowls, shawarma, Cheeta Camp"><div aria-hidden="true">{[0,1].map(i => <span key={i}>WAFFLES <b>✳</b> CHOCOLATE BOWLS <b>✳</b> SHAWARMA <b>✳</b> CHEETA CAMP <b>✳</b> </span>)}</div></div>
    <MenuExperience embedded/>
    <section id="grill" className="grill-section editorial-shell">
      <Reveal className="section-heading"><div><p className="small-label">03 / THE SAVOURY SIDE</p><h2>LET'S <em>ROLL.</em></h2></div><p>Follow your craving to the savoury side.<br/>Rolls, burgers, starters and more.</p></Reveal>
      <div className="grill-grid"><GrillFilm/><Reveal className="grill-copy"><span className="outline-number">.88</span><p className="small-label">THE GRILL</p><h3>A DIFFERENT<br/>KIND OF<br/><em>COMFORT.</em></h3><p>Something warm. Something savoury. Explore the other side of the menu and choose your next bite.</p><Link className="editorial-button" to="/menu?type=savoury">Explore savoury <ArrowUpRight size={18}/></Link></Reveal></div>
    </section>
    <section id="reels" className="social-section editorial-shell"><Reveal className="section-heading"><div><p className="small-label">04 / OUT OF THE FEED. INTO YOUR CRAVINGS.</p><h2>CRAVING POINT <em>IRL.</em></h2></div><a className="text-link" href={settings.instagram_url} target="_blank" rel="noreferrer"><Instagram size={18}/> @cravingpoint88 <ArrowUpRight size={18}/></a></Reveal><div className="social-grid">{[{src:'gallery3-1152.webp',title:'The sweet side',label:'WAFFLE MOMENTS'},{src:'gallery1-1152.webp',title:'A bowl worth a closer look',label:'LOADED WITH CHOCOLATE'},{src:'gallery2-1152.webp',title:'Your next craving',label:'FROM THE CRAVING POINT FEED'}].map((reel,i) => <a className="social-card" key={reel.src} href={settings.instagram_url} target="_blank" rel="noreferrer"><img src={'/images/'+reel.src} alt={reel.title} loading="lazy" width="1152" height="921"/><span className="social-index">0{i+1} / CP.88</span><span className="social-arrow"><ArrowUpRight/></span><div><p>{reel.label}</p><h3>{reel.title}</h3><span>OPEN ON INSTAGRAM ↗</span></div></a>)}</div></section>
    <section id="gifting" className="gifting-section"><div className="editorial-shell gifting-inner"><Reveal><p className="small-label">05 / MORE PEOPLE. MORE CRAVINGS.</p><h2>BIG PLANS.<br/><em>GOOD FOOD.</em></h2></Reveal><div><p>Planning a celebration, a team treat, or a gift? Tell us what you have in mind.</p><p className="gifting-note">Ask our team about quantities, lead time and delivery for your occasion.</p><a href={whatsapp+'?text='+encodeURIComponent('Hello Craving Point, I would like to plan a bulk or gifting order. Please share available options, minimum quantities, lead time and delivery areas.')} target="_blank" rel="noreferrer" className="editorial-button">Plan a bulk order <ArrowUpRight size={18}/></a></div></div></section>
    <section id="location" className="visit-section editorial-shell"><Reveal className="visit-copy"><p className="small-label">06 / YOUR NEIGHBOURHOOD CRAVING</p><h2>CHEETA CAMP.<br/><em>COME HUNGRY.</em></h2><address>{settings.address}</address><p className="visit-hours">{settings.opening_hours_label}</p><div className="hero-actions"><a href={settings.google_maps_url} target="_blank" rel="noreferrer" className="editorial-button"><MapPin size={18}/> Get directions</a><a href={whatsapp} target="_blank" rel="noreferrer" className="text-link">Message us <ArrowUpRight size={16}/></a></div></Reveal><div className="visit-map"><iframe title="Find Craving Point .88 in Cheeta Camp" src={'https://www.google.com/maps?q='+encodeURIComponent(settings.address)+'&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><span>MUMBAI, MAHARASHTRA / 400088</span></div></section>
  </div>
}

