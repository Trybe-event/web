import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../lib/password-policy.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`)(
  require,
  compiledModule,
  compiledModule.exports,
);
const { newPasswordSchema, passwordRequirements } = compiledModule.exports;

test("new passwords must meet every displayed requirement", () => {
  for (const password of [
    "",
    "Short1",
    "lowercaseonly123456",
    "UPPERCASEONLY123456",
    "NoDigitsInThisPassword",
  ]) {
    assert.equal(newPasswordSchema.safeParse(password).success, false);
    assert.equal(
      passwordRequirements.every((requirement) => requirement.test(password)),
      false,
    );
  }
});
test("long passwords, symbols and spaces remain supported", () => {
  for (const password of [
    "ExamplePassword7!",
    "Long example Passphrase 2",
    "A9" + "x".repeat(80),
  ]) {
    assert.equal(newPasswordSchema.safeParse(password).success, true);
    assert.equal(
      passwordRequirements.every((requirement) => requirement.test(password)),
      true,
    );
  }
});

test("password length uses the requested 8-character boundary", () => {
  assert.equal(
    newPasswordSchema.safeParse("Aa1" + "x".repeat(4)).success,
    false,
  );
  assert.equal(
    newPasswordSchema.safeParse("Aa1" + "x".repeat(5)).success,
    true,
  );
});
