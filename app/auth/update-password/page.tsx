import { Navbar } from "@/components/projecthub/navbar";
import { UpdatePasswordForm } from "@/components/projecthub/update-password-form";

export default function UpdatePassword(){
  return <div><Navbar/><main className="auth-page"><div className="auth-card">
    <p className="eyebrow">Account recovery</p><h1>Choose a new password.</h1>
    <p>Set a new password for your ProjectHub account.</p>
    <UpdatePasswordForm/>
  </div></main></div>;
}
