import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Your own profile is not a place to block or report anyone: the only attendee
// it can name is you. Those actions live on another attendee's profile and on a
// conversation (web#15), so this page must never call them.
const source = readFileSync(
  new URL("../app/attendee/profile/profile-home.tsx", import.meta.url),
  "utf8",
);

test("your own profile cannot block or report you", () => {
  assert.ok(
    !source.includes('"/blocks"'),
    "no block request from your profile",
  );
  assert.ok(
    !source.includes('"/reports"'),
    "no report request from your profile",
  );
  assert.ok(!source.includes("Block this person"));
  assert.ok(!source.includes("Report this person"));
});

test("your own profile still deletes the account and edits it", () => {
  assert.ok(source.includes('api.DELETE("/me")'), "delete account stays");
  assert.ok(source.includes("/attendee/profile/edit"), "edit stays");
  assert.ok(source.includes("/attendee/profile/settings"), "settings stay");
});
