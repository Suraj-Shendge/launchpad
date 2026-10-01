import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({
  name:z.string().trim().min(2).max(80),
  tagline:z.string().trim().min(5).max(120),
  description:z.string().trim().min(20).max(4000),
  website_url:z.string().url().max(500),
  category_id:z.string().uuid(),
  tags:z.string().max(500).optional(),
  social_links:z.string().max(1000).optional(),
  github_url:z.string().url().max(500),
  logo_url:z.string().url().max(1000).optional().or(z.literal("")),
});

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);}

function validImage(file:File){
  return file.size<=4*1024*1024 && ["image/png","image/jpeg","image/webp"].includes(file.type);
}
export async function POST(request:Request){
  if(!hasEnvVars) return serviceUnavailable();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const form=await request.formData();
  const parsed=schema.safeParse(Object.fromEntries(form.entries()));
  if(!parsed.success) return NextResponse.json({error:"Please check the required fields."},{status:400});
  const value=parsed.data;
  try{
    const github=new URL(value.github_url);
    if(github.hostname.toLowerCase()!=="github.com" || github.pathname.split("/").filter(Boolean).length<2)
      return NextResponse.json({error:"A valid GitHub repository URL is required."},{status:400});
  }catch{
    return NextResponse.json({error:"A valid GitHub repository URL is required."},{status:400});
  }

  const {data:category,error:categoryError}=await supabase.from("categories").select("name").eq("id",value.category_id).maybeSingle();
  if(categoryError||!category) return NextResponse.json({error:"The selected category is invalid."},{status:400});

  const imageFiles=form.getAll("preview_images").filter((value):value is File=>value instanceof File && value.size>0);
  if(imageFiles.length>4) return NextResponse.json({error:"You can upload up to 4 preview images."},{status:400});
  const invalid=imageFiles.find(file=>!validImage(file));
  if(invalid) return NextResponse.json({error:"Preview images must be PNG, JPG or WEBP under 4 MB each."},{status:400});

  let slug=slugify(value.name);
  const {data:existing}=await supabase.from("projects").select("id").eq("slug",slug).maybeSingle();
  if(existing) slug=slug+"-"+crypto.randomUUID().slice(0,8);

  let logo_url=value.logo_url||null;
  const file=form.get("logo");
  if(file instanceof File && file.size>0){
    if(file.size>2*1024*1024 || !["image/png","image/jpeg","image/webp","image/svg+xml"].includes(file.type))
      return NextResponse.json({error:"Logo must be PNG, JPG, WEBP or SVG under 2 MB."},{status:400});
    const extension=file.type.split("/")[1].replace("jpeg","jpg");
    const path=user.id+"/logos/"+crypto.randomUUID()+"."+extension;
    const upload=await supabase.storage.from("project-images").upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});
    if(upload.error) return NextResponse.json({error:"Logo upload failed. Check storage configuration."},{status:500});
    logo_url=supabase.storage.from("project-images").getPublicUrl(path).data.publicUrl;
  }
  const preview_images:string[]=[];
  for(const image of imageFiles){
    const extension=image.type.split("/")[1].replace("jpeg","jpg");
    const path=user.id+"/previews/"+crypto.randomUUID()+"."+extension;
    const upload=await supabase.storage.from("project-images").upload(path,await image.arrayBuffer(),{contentType:image.type,upsert:false});
    if(upload.error) return NextResponse.json({error:"A preview image could not be uploaded."},{status:500});
    preview_images.push(supabase.storage.from("project-images").getPublicUrl(path).data.publicUrl);
  }

  const social_links:Record<string,string>={};
  for(const item of (value.social_links||"").split(",")){
    const separator=item.indexOf("=");
    const key=(separator<0?item:item.slice(0,separator)).trim();
    const url=(separator<0?"":item.slice(separator+1)).trim();
    if(key&&url) social_links[key]=url;
  }

  const {data:project,error}=await supabase.from("projects").insert({
    user_id:user.id,owner_id:user.id,name:value.name,slug,tagline:value.tagline,description:value.description,
    website_url:value.website_url,github_url:value.github_url||null,category:category.name,category_id:value.category_id,logo_url,social_links,preview_images,status:"pending_review",
  }).select("id,slug").single();
  if(error) return NextResponse.json({error:error.code==="23505"?"That project URL is already taken.":"Could not create project."},{status:400});

  const verificationToken="phv_"+crypto.randomUUID().replace(/-/g,"");
  const verification=await supabase.from("project_verifications").insert({project_id:project.id,github_url:value.github_url||null,website_url:value.website_url,verification_token:verificationToken});
  if(verification.error) console.error("Project verification initialization failed",verification.error);

  const tagNames=(value.tags||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,8);
  for(const name of tagNames){
    const tagSlug=slugify(name);
    let {data:tag}=await supabase.from("tags").select("id").eq("slug",tagSlug).maybeSingle();
    if(!tag){
      const inserted=await supabase.from("tags").insert({name,slug:tagSlug}).select("id").single();
      tag=inserted.data;
    }
    if(tag) await supabase.from("project_tags").upsert({project_id:project.id,tag_id:tag.id});
  }
  return NextResponse.json({id:project.id,slug:project.slug});
}
