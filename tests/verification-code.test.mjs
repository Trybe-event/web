import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const javascript = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    (name) => dependencies[name] ?? require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const policy = compile("../lib/verification-code.ts");

function inputHarness(initial = "", disabled = false) {
  let value = initial;
  const focused = [];
  const references = { current: [] };
  const firstInput = { current: null };
  const jsx = (type, props) => ({ type, props });
  const { VerificationCodeInput } = compile(
    "../components/ui/verification-code-input.tsx",
    {
      react: { forwardRef: (render) => render, useRef: () => references },
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "@/lib/verification-code": policy,
      "./field": { Input: "input" },
    },
  );
  function render() {
    const tree = VerificationCodeInput(
      {
        id: "code",
        value,
        onChange: (next) => {
          value = next;
        },
        onBlur() {},
        disabled,
        "aria-describedby": "code-help",
        "aria-invalid": true,
      },
      firstInput,
    );
    const inputs = tree.props.children.map((node) => node.props);
    inputs.forEach((input, index) =>
      input.ref({ focus: () => focused.push(index), select() {} }),
    );
    return inputs;
  }
  return {
    render,
    focused,
    firstInput,
    value: () => value,
    change: (index, text) =>
      render()[index].onChange({ target: { value: text } }),
    paste: (index, text) =>
      render()[index].onPaste({
        preventDefault() {},
        clipboardData: { getData: () => text },
      }),
    key(index, key, modifiers = {}) {
      let prevented = false;
      render()[index].onKeyDown({
        key,
        ...modifiers,
        preventDefault() {
          prevented = true;
        },
      });
      return prevented;
    },
  };
}

test("verification schema accepts exactly six ASCII digits, including leading zeroes", () => {
  for (const code of ["012345", "123456"])
    assert.equal(
      policy.verificationCodeSchema.safeParse({ code }).success,
      true,
    );
  for (const code of [
    "",
    "12345",
    "1234567",
    "12345a",
    "123!56",
    " 123456",
    "１２３４５６",
    "123456\n",
  ])
    assert.equal(
      policy.verificationCodeSchema.safeParse({ code }).success,
      false,
      JSON.stringify(code),
    );
});

test("six labelled boxes retain the form ref, accessibility information and OTP autofill", () => {
  const harness = inputHarness();
  const inputs = harness.render();
  assert.equal(inputs.length, 6);
  assert.ok(harness.firstInput.current);
  assert.equal(inputs[0].id, "code");
  assert.equal(inputs[0].autoComplete, "one-time-code");
  inputs.forEach((input, index) => {
    assert.equal(input["aria-label"], `Digit ${index + 1} of 6`);
    assert.equal(input["aria-describedby"], "code-help");
    assert.equal(input["aria-invalid"], true);
    assert.equal(input.inputMode, "numeric");
  });
});

test("digits fill boxes and advance focus; letters and symbols leave the value unchanged", () => {
  const harness = inputHarness();
  for (let index = 0; index < 6; index++) harness.change(index, String(index));
  assert.equal(harness.value(), "012345");
  assert.equal(harness.focused.at(-1), 5);
  for (const text of ["a", "!", "1a", "١"]) harness.change(2, text);
  assert.equal(harness.value(), "012345");
  assert.equal(harness.key(2, "@"), true);
  assert.equal(harness.key(2, "a"), true);
  assert.equal(harness.key(2, "Tab"), false);
  assert.equal(harness.key(2, "Enter"), false);
  assert.equal(harness.key(2, "v", { ctrlKey: true }), false);
});

test("paste and autofill accept six digits without overflowing or accepting mixed text", () => {
  const harness = inputHarness();
  harness.paste(3, "012345");
  assert.equal(harness.value(), "012345");
  harness.paste(0, "987654321");
  assert.equal(harness.value(), "987654");
  harness.paste(0, "123 456");
  assert.equal(harness.value(), "987654");
  harness.change(0, "111222");
  assert.equal(harness.value(), "111222");
});

test("backspace, delete and arrows allow correction without submitting", () => {
  const harness = inputHarness("123");
  harness.key(3, "Backspace");
  assert.equal(harness.value(), "12");
  assert.equal(harness.focused.at(-1), 2);
  harness.key(0, "Delete");
  assert.equal(harness.value(), "2");
  harness.key(0, "ArrowLeft");
  assert.equal(harness.focused.at(-1), 0);
  harness.key(5, "ArrowRight");
  assert.equal(harness.focused.at(-1), 5);
});

test("disabled verification fields cannot accept pasted or typed codes", () => {
  const harness = inputHarness("123456", true);
  harness.paste(0, "987654");
  harness.change(0, "9");
  assert.equal(harness.value(), "123456");
  assert.ok(harness.render().every((input) => input.disabled));
});
