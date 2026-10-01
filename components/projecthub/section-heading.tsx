import Link from "next/link";

export function SectionHeading({eyebrow,title,description,href}:{eyebrow?:string;title:string;description?:string;href?:string}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-copy">{description}</p>}
      </div>
      {href && <Link className="text-link" href={href}>View all <span aria-hidden>↗</span></Link>}
    </div>
  );
}
