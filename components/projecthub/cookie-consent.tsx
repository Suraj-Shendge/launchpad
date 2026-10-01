"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ProjectHubConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: 1;
};

const COOKIE="ph_cookie_consent";
const EVENT="projecthub-consent";
const YEAR=60*60*24*365;

export function readConsent():ProjectHubConsent|null{
  if(typeof document==="undefined")return null;
  const item=document.cookie.split("; ").find(x=>x.startsWith(COOKIE+"="));
  if(!item)return null;
  try{return JSON.parse(decodeURIComponent(item.slice(COOKIE.length+1))) as ProjectHubConsent}catch{return null}
}

function saveConsent(value:ProjectHubConsent){
  document.cookie=COOKIE+"="+encodeURIComponent(JSON.stringify(value))+"; Max-Age="+YEAR+"; Path=/; SameSite=Lax";
  window.dispatchEvent(new CustomEvent(EVENT,{detail:value}));
}

export function consentEventName(){return EVENT}

export function CookieConsent(){
  const [consent,setConsent]=useState<ProjectHubConsent|null>(null);
  const [open,setOpen]=useState(false);
  const [analytics,setAnalytics]=useState(false);
  const [marketing,setMarketing]=useState(false);

  useEffect(()=>{
    const current=readConsent();
    setConsent(current);
    if(current){setAnalytics(current.analytics);setMarketing(current.marketing)}
  },[]);
  function apply(nextAnalytics:boolean,nextMarketing:boolean){
    const value:ProjectHubConsent={necessary:true,analytics:nextAnalytics,marketing:nextMarketing,version:1};
    saveConsent(value);
    setConsent(value);
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setOpen(false);
  }

  return <>
    {!consent && !open && <div className="cookie-banner" role="dialog" aria-label="Cookie preferences">
      <div className="cookie-banner-copy">
        <strong>ProjectHub uses cookies</strong>
        <p>Essential cookies keep ProjectHub secure and working. Optional analytics cookies help us understand site usage. <Link href="/cookies">Learn more</Link></p>
      </div>
      <div className="cookie-banner-actions">
        <button className="cookie-text-button" onClick={()=>setOpen(true)}>Manage preferences</button>
        <button className="cookie-button cookie-reject" onClick={()=>apply(false,false)}>Reject non-essential</button>
        <button className="cookie-button cookie-accept" onClick={()=>apply(true,true)}>Accept all</button>
      </div>
    </div>}

    {(consent || open) && <button className="cookie-settings-trigger" onClick={()=>setOpen(true)} aria-label="Open cookie settings">
      Cookie settings
    </button>}
    {open && <div className="cookie-backdrop" role="presentation" onMouseDown={()=>consent&&setOpen(false)}>
      <section className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-title" onMouseDown={e=>e.stopPropagation()}>
        <div className="cookie-modal-head">
          <div><p className="eyebrow">Privacy</p><h2 id="cookie-title">Cookie preferences.</h2></div>
          {consent && <button className="cookie-close" onClick={()=>setOpen(false)} aria-label="Close">×</button>}
        </div>
        <p className="cookie-modal-intro">Choose which non-essential technologies ProjectHub may use. Your choice is stored so we do not ask again on every visit.</p>

        <div className="cookie-option">
          <div><strong>Essential</strong><span>Authentication, security, consent preferences and core site functionality.</span></div>
          <b>Always on</b>
        </div>
        <label className="cookie-option cookie-toggle">
          <div><strong>Analytics</strong><span>First-party visitor and product-usage measurements used to improve ProjectHub.</span></div>
          <input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/>
        </label>
        <label className="cookie-option cookie-toggle">
          <div><strong>Marketing</strong><span>Optional advertising or campaign measurement technologies, when introduced.</span></div>
          <input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/>
        </label>

        <div className="cookie-modal-actions">
          <button className="cookie-button cookie-reject" onClick={()=>apply(false,false)}>Reject non-essential</button>
          <button className="cookie-button cookie-accept" onClick={()=>apply(analytics,marketing)}>Save preferences</button>
        </div>
        <p className="cookie-modal-foot">Read the <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>.</p>
      </section>
    </div>}
  </>;
}
