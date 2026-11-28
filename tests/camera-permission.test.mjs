import test from "node:test";
import assert from "node:assert/strict";

const config = (
  await import(new URL("../next.config.ts", import.meta.url).href)
).default;

// Next.js applies every matching rule in order; for the same header the last wins.
async function policyFor(path) {
  let value;
  for (const rule of await config.headers()) {
    // ":path*" is zero or more segments, so "/organizer/:path*" covers "/organizer".
    const pattern = new RegExp(
      "^" + rule.source.replace("/:path*", "(?:/.*)?") + "$",
    );
    if (!pattern.test(path)) continue;
    for (const header of rule.headers)
      if (header.key === "Permissions-Policy") value = header.value;
  }
  return value;
}

test("only the organizer area may ask for this site's camera", async () => {
  for (const path of [
    "/organizer/events/abc/attendance",
    "/organizer",
    "/organizer/events/abc",
  ])
    assert.match(await policyFor(path), /(^|, )camera=\(self\)/, path);
  for (const path of ["/", "/attendee", "/events/abc/pass", "/abc123"])
    assert.match(await policyFor(path), /(^|, )camera=\(\)/, path);
  // Microphone and location stay off everywhere.
  assert.match(
    await policyFor("/organizer/events/abc/attendance"),
    /microphone=\(\), geolocation=\(\)/,
  );
});
