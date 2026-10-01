import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
export default function NotFound(){return <div><Navbar/><main className="auth-page"><div className="auth-card"><p className="eyebrow">404</p><h1>That project is not here.</h1><p>The page may have moved, expired, or never been published.</p><Link href="/explore" className="button-primary">Explore projects ↗</Link></div></main><Footer/></div>}