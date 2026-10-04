import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type RateLimitPolicy={
  limit:number;
  windowSeconds:number;
  failClosed?:boolean;
};

export function hashRateLimitKey(value:string){
  return createHash("sha256").update(value).digest("hex");
}

export function getClientIp(request:Request){
  const forwarded=request.headers.get("x-forwarded-for");
  if(forwarded)return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim()||"unknown";
}

export async function consumeRateLimit(
  admin:SupabaseClient,
  key:string,
  policy:RateLimitPolicy,
){
  const {data,error}=await admin.rpc("consume_api_rate_limit",{
    p_key_hash:hashRateLimitKey(key),
    p_limit:policy.limit,
    p_window_seconds:policy.windowSeconds,
  });
  if(error){
    console.error("Rate limiter unavailable",error);
    return policy.failClosed===true ? false : true;
  }
  return data===true;
}

export function rateLimitResponse(retryAfterSeconds=60){
  return NextResponse.json(
    {error:"Too many requests. Please try again later."},
    {status:429,headers:{"Retry-After":String(retryAfterSeconds)}},
  );
}
