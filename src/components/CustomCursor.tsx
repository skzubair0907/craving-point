import { useEffect, useRef } from 'react'
import { useQuality } from '../hooks/useExperience'
export default function CustomCursor(){
 const ref=useRef<HTMLDivElement>(null),quality=useQuality()
 useEffect(()=>{const el=ref.current;if(!el||quality!=='high')return;let frame=0,x=0,y=0,tx=0,ty=0;const tick=()=>{x+=(tx-x)*.2;y+=(ty-y)*.2;el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;frame=Math.abs(tx-x)+Math.abs(ty-y)>.1?requestAnimationFrame(tick):0};const move=(e:PointerEvent)=>{tx=e.clientX;ty=e.clientY;el.style.opacity='1';const target=e.target as HTMLElement;el.textContent=target.closest('.film-play')?'PLAY':target.closest('.food-add')?'ADD':target.closest('.food-card-image,.social-card')?'VIEW':'';el.classList.toggle('has-label',!!el.textContent);if(!frame)frame=requestAnimationFrame(tick)};const leave=()=>{el.style.opacity='0'};document.addEventListener('pointermove',move);document.addEventListener('pointerleave',leave);return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave)}},[quality])
 return quality==='high'?<div className="editorial-cursor" ref={ref} aria-hidden="true"/>:null
}
