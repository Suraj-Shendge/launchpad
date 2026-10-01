import { redirect } from "next/navigation";
export default function Page(){ redirect("/login?check-email=1"); }
