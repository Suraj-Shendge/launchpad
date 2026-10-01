import Link from "next/link";
import type { NewsletterBlock, NewsletterContent } from "@/lib/newsletter/types";

function blockText(block:NewsletterBlock){if(block.type==="hero"||block.type==="text")return block.body;return "";}

export function NewsletterRender({content}:{content:NewsletterContent}){
 return <div className="newsletter-render">{content.blocks.map(block=>{
  if(block.type==="hero") return <section className="newsletter-block newsletter-hero" key={block.id}><p className="eyebrow">{block.eyebrow}</p><h2>{block.title}</h2><p>{blockText(block)}</p>{block.imageUrl&&<img src={block.imageUrl} alt="" />}{block.ctaLabel&&block.ctaUrl&&<Link className="button-primary" href={block.ctaUrl}>{block.ctaLabel} ↗</Link>}</section>;
  if(block.type==="text") return <section className="newsletter-block newsletter-text" key={block.id}><p className="eyebrow">{block.eyebrow}</p><h2>{block.title}</h2><p>{block.body}</p></section>;
  if(block.type==="projects") return <section className="newsletter-block newsletter-list-block" key={block.id}><div className="newsletter-block-heading"><p className="eyebrow">Projects</p><h2>{block.heading}</h2></div><div className="newsletter-items">{block.items.map(item=><Link href={item.href} key={item.projectId} className="newsletter-item">{item.imageUrl&&<img src={item.imageUrl} alt="" />}<div><strong>{item.title}</strong><span>{item.tagline||item.excerpt}</span></div><i>↗</i></Link>)}</div></section>;
  if(block.type==="community") return <section className="newsletter-block newsletter-list-block" key={block.id}><div className="newsletter-block-heading"><p className="eyebrow">Community</p><h2>{block.heading}</h2></div><div className="newsletter-items">{block.items.map(item=><Link href={item.href} key={item.threadId} className="newsletter-item"><div><strong>{item.title}</strong><span>{item.excerpt}</span></div><i>↗</i></Link>)}</div></section>;
  return <section className="newsletter-block newsletter-cta" key={block.id}><div><h2>{block.title}</h2><p>{block.body}</p></div><Link className="button-primary" href={block.url}>{block.label} ↗</Link></section>;
 })}</div>;
}
