import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const javascript = ts.transpileModule(
  readFileSync(new URL("../lib/directory.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { directoryFilters, directoryQuery, mergeDirectoryPage } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);
test("filter URLs preserve repeated skills and interests and safely encode search text", () => {
  const filters = {
    q: "design & engineering",
    role: "Software engineer",
    skill: ["React", "TypeScript"],
    interest: ["Open source"],
    goal: "Meet people",
  };
  assert.deepEqual(directoryFilters(directoryQuery(filters)), filters);
  assert.ok(directoryQuery(filters).toString().includes("%26"));
});
test("empty and repeated filters normalize without silently adding other fields", () => {
  const result = directoryFilters(
    new URLSearchParams(
      "skill=React&skill=React&interest=&role=+&private_email=hidden",
    ),
  );
  assert.deepEqual(result.skill, ["React"]);
  assert.equal(result.role, "");
  assert.equal("private_email" in result, false);
});
test("pagination deduplicates attendees and replaces stale profiles without retaining revoked fields", () => {
  const profiles = mergeDirectoryPage(
    [
      {
        attendee_id: "one",
        full_name: "One",
        links: [{ kind: "website", value: "https://old.test" }],
      },
    ],
    [
      { attendee_id: "one", full_name: "Updated" },
      { attendee_id: "two", full_name: "Two" },
    ],
  );
  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].full_name, "Updated");
  assert.equal("links" in profiles[0], false);
});
