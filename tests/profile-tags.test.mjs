import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../lib/profile-tags.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { addProfileTags } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("comma-separated tags trim spaces and ignore duplicates and empty segments", () => {
  assert.deepEqual(
    addProfileTags(["React"], [" react ", "TypeScript", "", " UI design "])
      .tags,
    ["React", "TypeScript", "UI design"],
  );
});
test("tag limits reject the batch without dropping existing tags", () => {
  const existing = Array.from({ length: 20 }, (_, index) => `Skill ${index}`);
  assert.ok(addProfileTags(existing, ["Another skill"]).error);
  assert.deepEqual(addProfileTags(existing, ["Another skill"]).tags, existing);
  assert.ok(addProfileTags(["React"], ["x".repeat(41)]).error);
  assert.deepEqual(addProfileTags(["React"], ["Valid", "x".repeat(41)]).tags, [
    "React",
  ]);
});
test("existing tags can be removed then new ones added without exceeding the limit", () => {
  const existing = Array.from({ length: 20 }, (_, index) => `Skill ${index}`);
  const updated = addProfileTags(
    existing.filter((tag) => tag !== "Skill 0"),
    ["Accessibility"],
  );
  assert.equal(updated.error, undefined);
  assert.equal(updated.tags.length, 20);
  assert.ok(updated.tags.includes("Accessibility"));
});
