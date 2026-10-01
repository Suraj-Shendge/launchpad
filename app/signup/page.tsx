import { Navbar } from "@/components/projecthub/navbar";
import { AuthForm } from "@/components/projecthub/auth-form";

export default function Signup(){
  return <div><Navbar/><main className="auth-page"><div className="auth-card">
    <p className="eyebrow">Start building</p><h1>Create your ProjectHub account.</h1>
    <p>Launch projects, manage promotion and participate in premium placements.</p>
    <AuthForm mode="signup"/>
  </div></main></div>;
}