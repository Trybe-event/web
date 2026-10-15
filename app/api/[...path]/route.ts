import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { authConfigured } from "@/lib/auth-config";
export const dynamic = "force-dynamic";

// Deliberate endpoint mappings, not a generic authenticated reverse proxy.
const routes: Record<string,string[]> = {
 "v1/me":["GET"], "v1/accounts/organizer":["POST"], "v1/accounts/attendee":["POST"], "v1/organizer/me":["GET"],
};
const reply = (status:number,error:string,message:string) => NextResponse.json({error,message},{status,headers:{"Cache-Control":"no-store"}});
type Context = { params:Promise<{path?:string[]}> };
async function handler(request:NextRequest,context:Context) {
 const path = ((await context.params).path ?? []).join("/");
 if (!routes[path]) return reply(404,"not_found","This endpoint is not available.");
 if (!routes[path].includes(request.method)) return reply(405,"method_not_allowed","This method is not available.");
 if (request.method !== "GET" && request.headers.get("origin") !== request.nextUrl.origin) return reply(403,"invalid_origin","Please submit this request from Trybe.");
 if (!authConfigured()) return reply(503,"authentication_unavailable","Account access is not configured.");
 const session = await auth();
 if (!session.userId) return reply(401,"unauthenticated","Sign in required.");
 const token = await session.getToken();
 if (!token) return reply(401,"unauthenticated","Sign in required.");
 let body:string|undefined;
 if (request.method !== "GET") {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415,"invalid_content_type","Send JSON data.");
  const reader=request.body?.getReader();
  const chunks:Uint8Array[]=[]; let length=0;
  if (reader) {
   while (true) { const {done,value}=await reader.read(); if (done) break; length+=value.length; if (length>16384) { await reader.cancel(); return reply(413,"body_too_large","This request is too large."); } chunks.push(value); }
  }
  body=Buffer.concat(chunks).toString("utf8");
 }
 try {
  const response = await fetch(new URL(`/${path}`,process.env.API_BASE_URL ?? "http://127.0.0.1:8080"),{
   method:request.method,headers:{Authorization:`Bearer ${token}`,Accept:"application/json",...(body!==undefined ? {"Content-Type":"application/json"} : {})},body,
   cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000),
  });
  // Never forward upstream cookies, location, provider headers or private diagnostics.
  const contentType=response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return reply(502,"invalid_upstream","Account services returned an unexpected response.");
  return new NextResponse(response.body,{status:response.status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 } catch { return reply(502,"upstream_unavailable","Account services are temporarily unavailable. Please try again."); }
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
