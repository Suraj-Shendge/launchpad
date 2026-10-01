import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";

export default function Cookies(){
  return <div><Navbar/><main className="legal-page section">
    <p className="eyebrow">Legal</p>
    <h1 className="section-title">Cookie policy.</h1>
    <div className="legal-copy">
      <p>This page explains the categories of storage technologies ProjectHub uses. The operator should review and replace this draft with jurisdiction-specific legal text before production launch.</p>
      <h2>Essential</h2>
      <p>First-party technologies required for authentication, security, consent preferences and core site functionality.</p>
      <h2>Analytics</h2>
      <p>Optional first-party visitor and project-usage measurements. ProjectHub only activates its analytics cookie after Analytics consent is enabled.</p>
      <h2>Marketing</h2>
      <p>Optional advertising or campaign measurement technologies. None are currently activated by ProjectHub.</p>
      <h2>Change your choice</h2>
      <p>Use the <strong>Cookie settings</strong> control on the site to review or change non-essential preferences.</p>
      <h2>Current analytics cookie</h2>
      <p><strong>ph_visitor_id</strong> is used for returning-visitor counting and is created only after Analytics consent. It may remain for up to one year.</p>
    </div>
  </main><Footer/></div>;
}
