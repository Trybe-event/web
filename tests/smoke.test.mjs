// Run against an unconfigured local server. Live-provider journeys need Clerk.
import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TRYBE_TEST_WEB_URL ?? "http://127.0.0.1:3000";
const get = (path, options={}) => fetch(new URL(path,base),{redirect:"manual",signal:AbortSignal.timeout(30000),...options});

test("separate authentication surfaces render safely without credentials",async()=>{
 for (const role of ["organizer","attendee"]) {
  for (const mode of ["sign-in","sign-up"]) {
   const response=await get(`/${role}/${mode}`);
   assert.equal(response.status,200);
   const html=await response.text();
   assert.ok(html.includes(`${role} account`) || html.includes(`${role} workspace`));
   assert.ok(html.includes("Account access is being prepared."));
   assert.match(html,/<button[^>]*disabled/);
  }
 }
});

test("signed-out workspace visits go to their own login",async()=>{
 for(const role of ["organizer","attendee"]) {
  const response=await get(`/${role}`);
  assert.equal(response.status,307);
  assert.equal(new URL(response.headers.get("location"),base).pathname,`/${role}/sign-in`);
 }
});

test("legacy profile links resolve to attendee routes",async()=>{
 for(const suffix of ["","/sign-in","/sign-up"]) {
  const response=await get(`/profile${suffix}`);
  assert.equal(response.status,307);
  assert.equal(new URL(response.headers.get("location"),base).pathname,`/attendee${suffix}`);
 }
});

test("proxy rejects unlisted endpoints, wrong methods and cross-origin writes",async()=>{
 assert.equal((await get("/api/healthz")).status,404);
 assert.equal((await get("/api/v1/me",{method:"DELETE"})).status,405);
 assert.equal((await get("/api/v1/accounts/organizer",{method:"POST",headers:{origin:"https://untrusted.example","content-type":"application/json"},body:"{}"})).status,403);
 assert.equal((await get("/api/v1/me",{headers:{"x-trybe-account-type":"organizer","authorization":"Bearer forged"}})).status,503);
});
