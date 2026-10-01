"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Project } from "@/lib/types";
import { WebGLCardRipple, type WebGLRippleApi } from "@/components/projecthub/webgl-card-ripple";
import { ProjectUpvoteButton } from "@/components/projecthub/project-upvote-button";

type CardTheme = {
  bg:string;
  bgSoft:string;
  fg:string;
  muted:string;
  pillBg:string;
  pillFg:string;
  chipBg:string;
  chipFg:string;
  border:string;
  logoSurface:string;
  logoRing:string;
};

const FALLBACK_THEME:CardTheme={
  bg:"#191917",bgSoft:"#353533",fg:"#ffffff",muted:"#b2b0aa",
  pillBg:"#474745",pillFg:"#ffffff",chipBg:"#353533",chipFg:"#ffffff",
  border:"rgba(255,255,255,.19)",logoSurface:"#f7f7f4",logoRing:"rgba(21,21,21,.18)",
};

function Initial({name}:{name:string}) {
  return <div className="project-mark" aria-hidden>{name.trim().slice(0,1).toUpperCase()}</div>;
}

function clamp(value:number,min:number,max:number) {
  return Math.min(max,Math.max(min,value));
}

function rgbToHex(r:number,g:number,b:number) {
  return "#"+[r,g,b].map(value=>Math.round(value).toString(16).padStart(2,"0")).join("");
}

function hexToRgb(hex:string):[number,number,number] {
  const value=hex.replace("#","");
  return [
    parseInt(value.slice(0,2),16)||0,
    parseInt(value.slice(2,4),16)||0,
    parseInt(value.slice(4,6),16)||0,
  ];
}

function relativeLuminance(r:number,g:number,b:number) {
  const channels=[r,g,b].map(value=>{
    const channel=value/255;
    return channel<=.03928?channel/12.92:Math.pow((channel+.055)/1.055,2.4);
  });
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}

function mixRgb(a:[number,number,number],b:[number,number,number],amount:number):[number,number,number] {
  return [a[0]+(b[0]-a[0])*amount,a[1]+(b[1]-a[1])*amount,a[2]+(b[2]-a[2])*amount];
}

function rgbToHsl(r:number,g:number,b:number):[number,number,number] {
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let h=0;
  const l=(max+min)/2;
  const s=delta===0?0:delta/(1-Math.abs(2*l-1));
  if(delta){
    if(max===r) h=((g-b)/delta)%6;
    else if(max===g) h=(b-r)/delta+2;
    else h=(r-g)/delta+4;
    h*=60;if(h<0)h+=360;
  }
  return [h,s,l];
}

function hslToRgb(h:number,s:number,l:number):[number,number,number] {
  h=((h%360)+360)%360;
  const c=(1-Math.abs(2*l-1))*s;
  const x=c*(1-Math.abs((h/60)%2-1));
  const m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}
  else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return [(r+m)*255,(g+m)*255,(b+m)*255];
}

function buildTheme(r:number,g:number,b:number):CardTheme {
  const [h,s,l]=rgbToHsl(r,g,b);
  const darkLogo=l<.48;
  const hasColor=s>.12;
  const bg=hasColor
    ? hslToRgb(h+180,darkLogo?.27:.34,darkLogo?.93:.18)
    : darkLogo?[255,255,255] as [number,number,number]:[25,25,23] as [number,number,number];
  const fgLuma=relativeLuminance(...bg);
  const fg=fgLuma>.52?"#151515":"#ffffff";
  // Give the logo its own high-contrast optical surface, independent of the card theme.
  const logoSurface=darkLogo?"#f7f7f4":"#171715";
  const logoRing=darkLogo?"rgba(21,21,21,.18)":"rgba(255,255,255,.28)";
  const muted=fg==="#ffffff"?mixRgb([255,255,255],bg,.36):mixRgb([21,21,21],bg,.56);
  const chip=fg==="#ffffff"?mixRgb(bg,[255,255,255],.12):mixRgb(bg,[21,21,21],.05);
  const pill=hasColor?mixRgb(bg,fg==="#ffffff"?[255,255,255]:[44,108,255],.18):mixRgb(bg,fg==="#ffffff"?[255,255,255]:[237,243,255],.2);
  return {
    bg:rgbToHex(...bg),
    bgSoft:rgbToHex(...mixRgb(bg,fg==="#ffffff"?[255,255,255]:[247,246,241],.34)),
    fg,muted:rgbToHex(...muted),pillBg:rgbToHex(...pill),pillFg:fg,
    chipBg:rgbToHex(...chip),chipFg:fg==="#ffffff"?"#fff":rgbToHex(...mixRgb([108,106,100],bg,.14)),
    border:fg==="#ffffff"?"rgba(255,255,255,.19)":"rgba(31,30,26,.12)",logoSurface,logoRing,
  };
}

function extractTheme(image:HTMLImageElement):CardTheme|null {
  try{
    if(!image.naturalWidth||!image.naturalHeight)return null;
    const size=48,canvas=document.createElement("canvas");
    canvas.width=size;canvas.height=size;
    const context=canvas.getContext("2d",{willReadFrequently:true});
    if(!context)return null;
    context.drawImage(image,0,0,size,size);
    const pixels=context.getImageData(0,0,size,size).data;
    let weight=0,r=0,g=0,b=0;
    for(let i=0;i<pixels.length;i+=4){
      const alpha=pixels[i+3]/255;if(alpha<.5)continue;
      const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
      const max=Math.max(red,green,blue),min=Math.min(red,green,blue);
      const saturation=max===0?0:(max-min)/max;
      const pixelWeight=alpha*(.35+.65*saturation);
      r+=red*pixelWeight;g+=green*pixelWeight;b+=blue*pixelWeight;weight+=pixelWeight;
    }
    return weight?buildTheme(clamp(r/weight,0,255),clamp(g/weight,0,255),clamp(b/weight,0,255)):null;
  }catch{return null}
}

export function ProjectCard({project}:{project:Project}) {
  const [theme,setTheme]=useState<CardTheme>(FALLBACK_THEME);
  const logoRef=useRef<HTMLImageElement|null>(null);
  const rippleRef=useRef<WebGLRippleApi|null>(null);
  const cardRef=useRef<HTMLAnchorElement|null>(null);
  const contentRef=useRef<HTMLDivElement|null>(null);
  const [useDirectLogo,setUseDirectLogo]=useState(false);
  const logoSrc=project.logo_url
    ? (useDirectLogo?project.logo_url:"/api/logo?url="+encodeURIComponent(project.logo_url))
    : undefined;
  const tagline=project.tagline?.trim()||project.description?.trim()||"Discover this project on ProjectHub.";
  const tags=project.tags.slice(0,2);

  useEffect(()=>{
    if(!project.logo_url)return;
    let cancelled=false;
    const image=new Image();
    image.crossOrigin="anonymous";
    image.onload=()=>{
      if(cancelled)return;
      const nextTheme=extractTheme(image);
      if(nextTheme)setTheme(nextTheme);
    };
    image.onerror=()=>{};
    image.src=logoSrc||project.logo_url;
    return()=>{cancelled=true;image.onload=null;image.onerror=null};
  },[project.logo_url,logoSrc]);

  const handlePointerMove=(event:PointerEvent<HTMLAnchorElement>)=>{
    event.currentTarget.classList.add("is-rippling");
    const rect=event.currentTarget.getBoundingClientRect();
    const x=clamp(event.clientX-rect.left,0,rect.width);
    const y=clamp(event.clientY-rect.top,0,rect.height);
    rippleRef.current?.move(x,y);
    // Keep the card completely locked in place. Cursor coordinates are used only by the WebGL ripple.
    event.currentTarget.style.setProperty("--ripple-x",x+"px");
    event.currentTarget.style.setProperty("--ripple-y",y+"px");
  };

  const handlePointerEnter=(event:PointerEvent<HTMLAnchorElement>)=>{
    event.currentTarget.classList.add("is-rippling");
    rippleRef.current?.start();
  };

  const handlePointerLeave=(event:PointerEvent<HTMLAnchorElement>)=>{
    event.currentTarget.style.setProperty("--ripple-x","50%");
    event.currentTarget.style.setProperty("--ripple-y","50%");
    event.currentTarget.classList.remove("is-rippling");
    rippleRef.current?.stop();
  };

  return (
    <article
      className={"project-card"+(project.featured?" is-featured":"")}
      style={{
        "--card-bg":theme.bg,"--card-bg-soft":theme.bgSoft,"--card-fg":theme.fg,
        "--card-muted":theme.muted,"--card-pill-bg":theme.pillBg,"--card-pill-fg":theme.pillFg,
        "--card-chip-bg":theme.chipBg,"--card-chip-fg":theme.chipFg,"--card-border":theme.border,
        "--card-logo-surface":theme.logoSurface,"--card-logo-ring":theme.logoRing,
      } as CSSProperties}
    >
      <Link
        href={`/projects/${project.slug}`}
        ref={cardRef}
        className="project-card-main"
        aria-label={`Open ${project.name}`}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div ref={contentRef} className="project-card-content">
          <div className="project-card-top">
            <div className="project-logo-wrap" style={{backgroundColor:"var(--card-logo-surface)"}}>
              {project.logo_url ? (
                <img
                  ref={logoRef}
                  src={logoSrc}
                  alt=""
                  className="project-logo"
                  onError={()=>{
                    if(!useDirectLogo)setUseDirectLogo(true);
                    else setTheme(FALLBACK_THEME);
                  }}
                  onLoad={()=>{
                    const nextTheme=extractTheme(logoRef.current!);
                    if(nextTheme)setTheme(nextTheme);
                  }}
                />
              ) : <Initial name={project.name}/>}
              <span className="project-logo-ring" aria-hidden />
            </div>
            {project.featured&&<span className="status-pill"><Sparkles size={10}/> Featured</span>}
          </div>

          <div className="project-card-copy">
            <h3>{project.name}</h3>
            <p>{tagline}</p>
          </div>

          <div className="project-card-bottom">
            <div className="project-meta">
              <span>{project.category?.name??"Project"}</span>
              {tags.map(tag=><span key={tag}>{tag}</span>)}
            </div>
            <span className="card-arrow" aria-hidden><ArrowUpRight size={15}/></span>
          </div>
        </div>
        <WebGLCardRipple ref={rippleRef} targetRef={cardRef} contentRef={contentRef} />
        <span className="project-card-shine" aria-hidden />
      </Link>
      <ProjectUpvoteButton projectId={project.id} initialCount={project.upvote_count ?? 0} initialUpvoted={project.viewer_upvoted} />
    </article>
  );
}
