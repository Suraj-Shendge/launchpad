import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { deriveOverallStatus, parseGitHubUrl, verifyGitHub, verifyWebsite } from "@/lib/project-verification";

async function getOwnedProject(id:string){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {error:NextResponse.json({error:"Authentication required."},{status:401})};
  const db=createAdminClient();
  const {data:project}=await db.from("projects").select("id,owner_id,website_url,github_url,name").eq("id",id).maybeSingle();
  if(!project||project.owner_id!==user.id) return {error:NextResponse.json({error:"Project not found."},{status:404})};
  return {db,project,user};
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const owned=await getOwnedProject(id); if("error" in owned) return owned.error;
  const {db,project}=owned;
  let {data:verification}=await db.from("project_verifications").select("*").eq("project_id",project.id).maybeSingle();
  if(!verification){
    const token="phv_"+crypto.randomUUID().replace(/-/g,"");
    verification=(await db.from("project_verifications").insert({project_id:project.id,github_url:project.github_url,website_url:project.website_url,github_status:project.github_url?"pending":"not_required",website_status:project.website_url?"pending":"not_required",cross_link_status:project.github_url&&project.website_url?"pending":"not_required",verification_token:token}).select("*").single()).data;
  }
  return NextResponse.json({verification});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const owned=await getOwnedProject(id); if("error" in owned) return owned.error;
  const {db,project,user}=owned;
  if(!await consumeRateLimit(db,"project-verification:"+user.id,{limit:5,windowSeconds:600,failClosed:true})) return rateLimitResponse();
  const body=await request.json().catch(()=>({})) as {check?:string};
  const check=body.check==="github"||body.check==="website"||body.check==="all"?body.check:"all";
  let {data:v}=await db.from("project_verifications").select("*").eq("project_id",project.id).maybeSingle();
  if(!v){
    const token="phv_"+crypto.randomUUID().replace(/-/g,"");
    v=(await db.from("project_verifications").insert({project_id:project.id,github_url:project.github_url,website_url:project.website_url,github_status:project.github_url?"pending":"not_required",website_status:project.website_url?"pending":"not_required",cross_link_status:project.github_url&&project.website_url?"pending":"not_required",verification_token:token}).select("*").single()).data;
  }
  if(!v) return NextResponse.json({error:"Could not initialize verification."},{status:500});
  let github=v.github_evidence||{},website=v.website_evidence||{},cross=v.cross_link_evidence||{};
  let githubStatus=project.github_url?v.github_status:"not_required",websiteStatus=project.website_url?v.website_status:"not_required",provenance=project.github_url?v.provenance_status:"not_required";
  if(check==="github"||check==="all"){
    const result=project.github_url?await verifyGitHub(project.github_url,v.verification_token):{status:"not_required",evidence:{},method:"none"};
    github=result.evidence; githubStatus=result.status; provenance=result.evidence?.fork?"fork":"unknown";
    await db.from("project_verification_checks").insert({project_id:project.id,check_type:"github",status:result.status,details:{...result.evidence,failure_reason:result.failure_reason||null}});
  }
  if(check==="website"||check==="all"){
    const gh=parseGitHubUrl(project.github_url||"");
    const result=project.website_url?await verifyWebsite(project.website_url,v.verification_token,gh?.fullName):{status:"not_required",evidence:{},method:"none"};
    website=result.evidence; websiteStatus=result.status;
    if(typeof result.evidence?.cross_link==="boolean") cross={matched:result.evidence.cross_link,github:gh?.fullName||null};
    await db.from("project_verification_checks").insert({project_id:project.id,check_type:"website",status:result.status,details:{...result.evidence,failure_reason:result.failure_reason||null}});
  }
  const overall=deriveOverallStatus(githubStatus,websiteStatus,provenance);
  const {data:updated,error}=await db.from("project_verifications").update({
    github_url:project.github_url,website_url:project.website_url,github_status:githubStatus,website_status:websiteStatus,
    cross_link_status:project.github_url&&project.website_url?(cross.matched===true?"verified":cross.matched===false?"failed":"pending"):"not_required",provenance_status:provenance,
    overall_status:overall,github_method:github.method||null,website_method:website.method||null,
    github_evidence:github,website_evidence:website,cross_link_evidence:cross,
    last_checked_at:new Date().toISOString(),
    github_checked_at:check==="website"?v.github_checked_at:new Date().toISOString(),
    website_checked_at:check==="github"?v.website_checked_at:new Date().toISOString()
  }).eq("project_id",project.id).select("*").single();
  if(error) return NextResponse.json({error:"Could not save verification result."},{status:500});
  return NextResponse.json({verification:updated});
}
