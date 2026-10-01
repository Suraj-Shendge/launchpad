import { NextResponse } from "next/server";

export function serviceUnavailable(message="Backend services are not configured yet."){
  return NextResponse.json({error:message},{status:503});
}
