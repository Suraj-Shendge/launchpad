import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { ForgotPasswordForm } from "@/components/projecthub/forgot-password-form";

export default function ForgotPassword(){
  return <div><Navbar/><main className="auth-page"><div className="auth-card">
    <p className="eyebrow">Account recovery</p><h1>Reset your password.</h1>
    <p>Enter your email and we’ll send a secure reset link.</p>
    <ForgotPasswordForm/>
    <Link href="/login" className="auth-muted">Back to login</Link>
  </div></main></div>;
}
