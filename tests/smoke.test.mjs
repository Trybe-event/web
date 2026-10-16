// Smoke tests against a running server with no Clerk keys (`npm run build && npm start`).
// Set TRYBE_TEST_WEB_URL to target another server. Journeys with real sign-in need Clerk.
import test from "node:test";
import assert from "node:assert/strict";

const base = process.env.TRYBE_TEST_WEB_URL ?? "http://127.0.0.1:3000";
const get = (path, options = {}) =>
  fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    ...options,
  });
const location = (r) => new URL(r.headers.get("location"), base).pathname;

test("sign-in and sign-up render safely without credentials", async () => {
  for (const role of ["organizer", "attendee"]) {
    for (const mode of ["sign-in", "sign-up"]) {
      const r = await get(`/${role}/${mode}`);
      assert.equal(r.status, 200, `/${role}/${mode}`);
      const html = await r.text();
      assert.ok(
        html.includes(`${role} workspace`) || html.includes(`${role} account`),
        `/${role}/${mode} names its account type`,
      );
      assert.ok(html.includes("Account access is being prepared."));
      assert.match(html, /<button[^>]*disabled/);
    }
  }
});

test("signed-out workspace visits go to their own sign-in", async () => {
  for (const [path, target] of [
    ["/organizer", "/organizer/sign-in"],
    ["/attendee", "/attendee/sign-in"],
    ["/attendee/profile", "/attendee/sign-in"],
    ["/attendee/profile/edit", "/attendee/sign-in"],
    ["/organizer/events/f2d1a2a4-0f0e-4c1d-9d3a-5a5f3f6b7c01/share", "/organizer/sign-in"],
  ]) {
    const r = await get(path);
    assert.equal(r.status, 307, path);
    assert.equal(location(r), target, path);
  }
});

test("legacy /profile links resolve to the attendee area", async () => {
  for (const [from, to] of [
    ["/profile", "/attendee"],
    ["/profile/sign-in", "/attendee/sign-in"],
    ["/profile/sign-up", "/attendee/sign-up"],
    ["/profile/edit", "/attendee/profile/edit"],
  ]) {
    const r = await get(from);
    assert.equal(r.status, 307, from);
    assert.equal(location(r), to, from);
  }
});

test("home offers both account types", async () => {
  const html = await (await get("/")).text();
  assert.ok(
    html.includes("/attendee/sign-in") && html.includes("/organizer/sign-in"),
  );
});

test("proxy refuses unlisted endpoints, wrong methods and cross-site writes", async () => {
  assert.equal((await get("/api/not-in-contract")).status, 404);
  assert.equal((await get("/api/healthz", { method: "DELETE" })).status, 404);
  const cross = await get("/api/accounts/organizer", {
    method: "POST",
    headers: {
      origin: "https://untrusted.example",
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal(cross.status, 403);
});

test("reserved words are never treated as event slugs", async () => {
  for (const path of ["/admin", "/dev"])
    assert.equal((await get(path)).status, 404, path);
});
