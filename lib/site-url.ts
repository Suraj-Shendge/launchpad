export function getSiteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/,"");
  if(explicit)return explicit;
  const vercel=process.env.VERCEL_URL?.trim().replace(/\/$/,"");
  if(vercel)return vercel.startsWith("http")?vercel:"https://"+vercel;
  return "http://localhost:3000";
}
