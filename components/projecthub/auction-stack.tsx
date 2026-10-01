"use client";

import Link from "next/link";
import { ArrowUpRight, Gavel } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";

type Winner = Project & { auctionEndsAt?: string | null; winningBid?: number | null };
type DisplayCard = Winner & { isPromotionPlaceholder?: boolean };

const promoPlaceholder:DisplayCard = {
  id:"promo-placeholder",creator_id:"",slug:"",name:"Promote Your Project Here",tagline:"Win premium homepage placement through the ProjectHub auction.",description:"",logo_url:null,preview_images:[],website_url:"/auctions",social_links:{},status:"published",created_at:"",updated_at:"",published_at:null,creator_name:"",tags:["Homepage Auction"],featured:false,promoted:true,upvote_count:0,category:{id:"promo",name:"Homepage Auction",slug:"homepage-auction",description:null},auctionEndsAt:null,winningBid:null,isPromotionPlaceholder:true,
};


export function AuctionStack({projects}:{projects:Winner[]}) {
  const cards:DisplayCard[]=projects.length===1 ? [projects[0],promoPlaceholder] : projects.length ? projects : [promoPlaceholder];
  const [index,setIndex]=useState(0);
  const [flipping,setFlipping]=useState(false);
  const [backIds,setBackIds]=useState<Set<string>>(()=>new Set());

  useEffect(()=>{
    if(cards.length<2) return;
    let finishTimer:number|undefined;

    const startTimer=window.setTimeout(()=>{
      const nextIndex=(index+1)%cards.length;
      const outgoingId=cards[index]?.id;
      const incomingId=cards[nextIndex]?.id;
      if(!outgoingId || !incomingId) return;

      // The next card is already underneath the front card.
      // If it was previously sitting back-side-up, quietly reset it
      // before it advances so the only visible flip is the outgoing card.
      setBackIds(previous=>{
        if(!previous.has(incomingId)) return previous;
        const next=new Set(previous);
        next.delete(incomingId);
        return next;
      });

      setFlipping(true);
      finishTimer=window.setTimeout(()=>{
        setBackIds(previous=>{
          const next=new Set(previous);
          next.add(outgoingId);
          return next;
        });
        setIndex(nextIndex);
        setFlipping(false);
      },720);
    },5000);

    return()=>{
      window.clearTimeout(startTimer);
      if(finishTimer) window.clearTimeout(finishTimer);
    };
  },[cards,index]);

  const ordered=useMemo(()=>cards.map((card,offset)=>cards[(index+offset)%cards.length]).slice(0,4),[cards,index]);

  return (
    <div className="auction-stage" aria-label="Homepage auction winners">
      <div className="auction-stage-label"><span><Gavel size={14}/> AUCTION WINNERS</span><small>Rotating homepage placement</small></div>
      <div className="auction-stack">
        {ordered.map((project,position)=>{
          const isPromo=Boolean(project.isPromotionPlaceholder);
          const href=isPromo ? "/auctions" : `/projects/${project.slug}`;
          return <Link key={project.id} href={href} aria-label={isPromo ? "Promote your project through the homepage auction" : `Open ${project.name}`} className={"auction-stack-card card-position-"+position+(isPromo?" is-promo":"")+(position===0&&flipping?" is-flipping":"")+(position===1&&flipping?" is-advancing":"")+(backIds.has(project.id)?" is-back":"")}>
            <div className="auction-card-inner">
              <div className="auction-card-face auction-card-front">
                <div className="auction-card-logo-pane">
                  {project.logo_url ? <img src={project.logo_url} alt="" /> : <span>{isPromo ? "+" : project.name.slice(0,1).toUpperCase()}</span>}
                </div>
                <div className="auction-card-copy">
                  <div className="auction-card-topline"><span>{project.category?.name ?? "Project"}</span><strong>{isPromo ? "Promote" : "Winner"}</strong></div>
                  <h2>{project.name}</h2>
                  <p>{project.tagline}</p>
                  <div className="auction-card-footer"><span>{isPromo ? "Premium homepage placement" : `Winning bid ${project.winningBid ? `₹${project.winningBid.toLocaleString("en-IN")}` : "—"}`}</span><span className="auction-card-open">{isPromo ? "View auctions" : "Open"} <ArrowUpRight size={14}/></span></div>
                </div>
              </div>
              <div className="auction-card-face auction-card-back" aria-hidden="true" />
            </div>
          </Link>;
        })}
      </div>
    </div>
  );
}
