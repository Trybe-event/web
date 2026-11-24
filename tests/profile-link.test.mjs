import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const javascript = ts.transpileModule(
  readFileSync(new URL("../lib/profile-link.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { isWebsiteLink, hasLinkScheme, normalizeProfileLink } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("website fields save bare domains with HTTPS", () => {
  for (const kind of ["portfolio", "linkedin", "other"]) {
    assert.equal(isWebsiteLink(kind), true);
    assert.equal(
      normalizeProfileLink(kind, " google.com "),
      "https://google.com",
    );
    assert.equal(
      normalizeProfileLink(kind, "www.example.com/work?a=1#about"),
      "https://www.example.com/work?a=1#about",
    );
  }
});

test("complete URLs are preserved without a duplicate protocol", () => {
  for (const value of [
    "https://example.com/work",
    "HTTPS://example.com",
    "http://example.com",
  ]) {
    assert.equal(hasLinkScheme(value), true);
    assert.equal(normalizeProfileLink("portfolio", value), value);
  }
});

test("email, phone, WhatsApp and social handles are not rewritten", () => {
  for (const [kind, value] of [
    ["email", "person@example.com"],
    ["phone", "+2348012345678"],
    ["whatsapp", "+2348012345678"],
    ["instagram", "@creator"],
    ["x", "@builder"],
  ]) {
    assert.equal(isWebsiteLink(kind), false);
    assert.equal(normalizeProfileLink(kind, value), value);
  }
});

test("empty and explicit non-HTTPS schemes remain subject to existing validation", () => {
  for (const value of [
    "",
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.com",
    "//example.com",
  ]) {
    assert.equal(normalizeProfileLink("portfolio", value), value);
  }
});
