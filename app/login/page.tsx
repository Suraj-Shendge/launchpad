import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { AuthForm } from "@/components/projecthub/auth-form";

export default function Login(){
  return <div><Navbar/><main className="auth-page"><div className="auth-card">
    <p className="eyebrow">Welcome back</p><h1>Log in to ProjectHub.</h1>
    <p>Manage your projects, promotions and launch activity.</p><AuthForm mode="login"/>
    <Link href="/auth/forgot-password" className="auth-muted">Forgot password?</Link>
  </div></main></div>;
}