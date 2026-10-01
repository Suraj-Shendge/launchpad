import Link from "next/link";
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams;
  return <div><main className="auth-page"><div className="auth-card">
    <p className="eyebrow">Account</p><h1>Something went wrong.</h1>
    <p>{params.error||"The authentication link could not be completed."}</p>
    <Link href="/login" className="button-primary">Back to login</Link>
  </div></main></div>;
}
