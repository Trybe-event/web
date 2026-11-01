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

test("all event workspace pages require attendee authentication", async () => {
  for (const path of [
    "/events/community",
    "/events/community/program",
    "/events/community/attendees",
    "/events/community/attendees/20000000-0000-4000-8000-000000000001",
  ]) {
    const response = await get(path);
    assert.ok([303, 307, 308].includes(response.status), path);
    assert.equal(location(response), "/attendee/sign-in", path);
  }
});

test("organizer event editing and sharing require organizer sign-in", async () => {
  for (const path of [
    "/organizer/events/new",
    "/organizer/events/11111111-1111-4111-8111-111111111111/edit",
    "/organizer/events/11111111-1111-4111-8111-111111111111/share",
  ]) {
    const response = await get(path);
    assert.ok([303, 307, 308].includes(response.status), path);
    assert.equal(location(response), "/organizer/sign-in", path);
  }
});

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
    // web#14: the connections page is behind the attendee guard like the rest of
    // the workspace, so a signed-out visitor gets no lists and no URLs.
    ["/attendee/connections", "/attendee/sign-in"],
    [
      "/organizer/events/f2d1a2a4-0f0e-4c1d-9d3a-5a5f3f6b7c01/share",
      "/organizer/sign-in",
    ],
    ["/events/atlas-summit", "/attendee/sign-in"],
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

test("moderation routes require administrator sign-in and expose no self-registration", async () => {
  for (const path of [
    "/admin",
    "/admin/reports",
    "/admin/reports/11111111-1111-4111-8111-111111111111",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 307);
    assert.equal(location(response), "/admin/sign-in");
  }
  const signIn = await get("/admin/sign-in");
  assert.equal(signIn.status, 200);
  const html = await signIn.text();
  assert.match(html, /Moderation sign-in/);
  assert.doesNotMatch(html, /Create account|Create your administrator account/);
  assert.equal((await get("/admin/sign-up")).status, 404);
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

test("the join flow carries the event slug through the account steps", async () => {
  // Signing up or in from an event keeps the slug, and the final step sends the
  // attendee back to that event rather than to their workspace home.
  for (const path of ["/attendee/sign-up", "/attendee/sign-in"]) {
    const r = await get(`${path}?event=atlas-summit`);
    assert.equal(r.status, 200, `${path} renders with an event`);
  }
  const complete = await get("/attendee/complete?event=atlas-summit");
  assert.equal(complete.status, 307);
  assert.equal(location(complete), "/attendee/sign-up");
  assert.equal(
    new URL(complete.headers.get("location"), base).search,
    "?event=atlas-summit",
    "the event survives the account step",
  );

  // Anything that is not a real event slug is dropped, not redirected to.
  const bad = await get("/attendee/complete?event=admin");
  assert.equal(bad.status, 307);
  assert.equal(location(bad), "/attendee/sign-up");
  assert.equal(new URL(bad.headers.get("location"), base).search, "");
});

test("reserved words are never treated as event slugs", async () => {
  const admin = await get("/admin");
  assert.equal(admin.status, 307);
  assert.equal(location(admin), "/admin/sign-in");
  for (const path of ["/dev", "/events/admin"])
    assert.equal((await get(path)).status, 404, path);
});

test("an unavailable event API never offers a blind join or exposes a saved profile", async () => {
  const response = await get("/atlas-summit");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("couldn’t load this event"));
  assert.ok(!html.includes("Confirm and join"));
  assert.ok(!html.includes("This is what people at"));
  const workspace = await get("/events/some-other-event");
  assert.equal(workspace.status, 307);
  assert.equal(location(workspace), "/attendee/sign-in");
});
