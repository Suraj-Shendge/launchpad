import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div><Link href="/" className="wordmark">Project<span>Hub</span></Link><p>Launch. Discover. Promote.</p></div>
        <div className="footer-links"><Link href="/explore">Discover</Link><Link href="/launch">Launch</Link><Link href="/promote">Promote</Link><Link href="/newsletter">Newsletter</Link><Link href="/pricing">Pricing</Link></div>
        <div className="footer-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/refund-policy">Refund policy</Link></div>
      </div>
      <div className="shell footer-bottom"><span>ProjectHub</span><span>Built for makers.</span></div>
    </footer>
  );
}
