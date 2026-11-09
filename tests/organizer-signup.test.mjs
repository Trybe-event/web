import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    process,
  })((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}
const policy = compile("../lib/organizer-signup.ts", {
  "./password-policy": compile("../lib/password-policy.ts"),
});
const details = {
  organization: "Trybe Studio",
  first_name: "Ada",
  last_name: "Okafor",
  phone: "08031234567",
};
const credentials = {
  ...details,
  email: "ada@example.com",
  password: "Password123",
  confirm_password: "Password123",
};

test("business phone formats local and international input without accepting malformed numbers", () => {
  for (const input of [
    "08031234567",
    "8031234567",
    "+2348031234567",
    "2348031234567",
    "0803 123 4567",
    "+234 (0)803-123-4567",
  ])
    assert.equal(policy.normalizeNigerianPhone(input), "+2348031234567");
  for (const input of [
    "",
    "call 08031234567",
    "+448031234567",
    "0803",
    "0008031234567",
    "+234803123456789",
  ])
    assert.equal(policy.normalizeNigerianPhone(input), null);
});

test("business signup validates every field, matching passwords and the existing password policy", () => {
  const schema = policy.authenticationCredentialsSchema(true, true);
  assert.equal(schema.safeParse(credentials).success, true);
  for (const field of [
    "organization",
    "first_name",
    "last_name",
    "phone",
    "email",
    "password",
    "confirm_password",
  ]) {
    const result = schema.safeParse({ ...credentials, [field]: "" });
    assert.equal(result.success, false, field);
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === field),
      field,
    );
  }
  assert.equal(
    schema.safeParse({
      ...credentials,
      password: "short",
      confirm_password: "short",
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...credentials,
      first_name: "a".repeat(60),
      last_name: "b".repeat(60),
    }).success,
    false,
  );
});

test("onboarding metadata strips passwords and cannot supply an account type", () => {
  const saved = policy.organizerSignupDetails({
    ...credentials,
    type: "admin",
    redirect: "https://evil.example",
  });
  assert.equal(saved.phone, "+2348031234567");
  assert.deepEqual(Object.keys(saved).sort(), [
    "first_name",
    "last_name",
    "organization",
    "phone",
  ]);
  assert.equal(
    policy.organizerSignupDetails({ ...details, phone: "invalid" }),
    undefined,
  );
  assert.equal(policy.organizerSignupDetails(null), undefined);
});

test("attendee signup and both sign-in modes do not require business details or confirmation", () => {
  const noBusiness = {
    email: "ada@example.com",
    password: "Password123",
    organization: "",
    first_name: "",
    last_name: "",
    phone: "",
    confirm_password: "",
  };
  assert.equal(
    policy.authenticationCredentialsSchema(false, true).safeParse(noBusiness)
      .success,
    true,
  );
  assert.equal(
    policy
      .authenticationCredentialsSchema(false, false)
      .safeParse({ ...noBusiness, password: "legacy" }).success,
    true,
  );
});

const link = {
  default: ({ children, ...props }) =>
    React.createElement("a", props, children),
  __esModule: true,
};
const { LegalNotice } = compile("../components/legal/legal-notice.tsx", {
  "next/link": link,
});

test("signup and joining link only to Trybe policies and preserve the current form", () => {
  for (const action of ["signup", "join"]) {
    const html = renderToStaticMarkup(
      React.createElement(LegalNotice, { action }),
    );
    assert.match(html, /href="\/terms"/);
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /target="_blank"/);
    assert.match(
      html,
      action === "join"
        ? /confirming and joining this event/
        : /creating an account/,
    );
    assert.doesNotMatch(html, /juve/);
  }
});

test("policy routes cannot be interpreted as invitation destinations", () => {
  const routes = compile("../lib/routes.ts");
  assert.equal(routes.isEventSlug("terms"), false);
  assert.equal(routes.isEventSlug("privacy"), false);
});

const { Field, Input } = compile("../components/ui/field.tsx", {
  "./cn": { cn: (...values) => values.filter(Boolean).join(" ") },
});
const ui = {
  Field,
  Input,
  Alert: ({ children }) => React.createElement("div", null, children),
  Button: ({ children, type, disabled, onClick }) =>
    React.createElement("button", { type, disabled, onClick }, children),
};
const authDependencies = {
  "@clerk/nextjs": {
    useAuth: () => ({ isLoaded: true }),
    useSignIn: () => ({ signIn: {}, errors: { fields: {} } }),
    useSignUp: () => ({ signUp: {}, errors: { fields: {} } }),
  },
  "@/lib/account": compile("../lib/account.ts"),
  "@/components/ui": ui,
  "@/lib/auth-flow": compile("../lib/auth-flow.ts"),
  "@/lib/password-policy": compile("../lib/password-policy.ts"),
  "@/lib/authentication-errors": compile("../lib/authentication-errors.ts"),
  "./password-checklist": {
    PasswordChecklist: () =>
      React.createElement("p", null, "Password requirements"),
  },
  "@/lib/organizer-signup": policy,
  "@/components/legal/legal-notice": { LegalNotice },
  "./email-confirmation": compile("../components/auth/email-confirmation.tsx"),
};
const { AuthForm } = compile(
  "../components/auth/auth-form.tsx",
  authDependencies,
);

test("organizer email stage shows the submitted address, real code input and recovery actions", () => {
  let stateIndex = 0;
  const { AuthForm: VerificationForm } = compile(
    "../components/auth/auth-form.tsx",
    {
      ...authDependencies,
      react: {
        ...React,
        useEffect: () => {},
        useState: (initial) => [
          stateIndex++ === 1 ? "verify-email" : initial,
          () => {},
        ],
      },
      "@clerk/nextjs": {
        ...authDependencies["@clerk/nextjs"],
        useSignUp: () => ({
          signUp: { emailAddress: "host@example.com" },
          errors: { fields: {} },
        }),
      },
    },
  );
  const html = renderToStaticMarkup(
    React.createElement(VerificationForm, {
      type: "organizer",
      mode: "sign-up",
      introduction: React.createElement(
        "h2",
        null,
        "Tell us about your business",
      ),
    }),
  );
  for (const text of [
    "ONE LAST STEP",
    "Check your email",
    "host@example.com",
    "Verification code",
    "I’ve confirmed my email",
    "Resend confirmation email",
    "Check your spam folder",
    "Change email address",
  ])
    assert.ok(html.includes(text), text);
  assert.doesNotMatch(
    html,
    /Tell us about your business|juve\.events|itighiseemmanuele@gmail.com/,
  );
  assert.match(html, /autoComplete="one-time-code"/i);
});

test("only organizer signup collects business details; both signup types show the policy notice", () => {
  for (const type of ["organizer", "attendee"]) {
    const signup = renderToStaticMarkup(
      React.createElement(AuthForm, { type, mode: "sign-up" }),
    );
    assert.match(signup, /href="\/terms"/);
    assert.match(signup, /href="\/privacy"/);
    for (const label of [
      "Registered business name",
      "Contact first name",
      "Contact last name",
      "Phone number",
      "Confirm password",
    ]) {
      assert.equal(signup.includes(label), type === "organizer", label);
    }
    const signin = renderToStaticMarkup(
      React.createElement(AuthForm, { type, mode: "sign-in" }),
    );
    assert.doesNotMatch(
      signin,
      /Registered business name|Confirm password|By creating an account/,
    );
  }
});

test("policy pages render the temporary approved contact and disclose draft and retention status", () => {
  const legal = compile("../lib/legal.ts");
  const layout = compile("../components/legal/policy-page.tsx", {
    "next/link": link,
    "@/components/auth/theme-toggle": {
      ThemeToggle: () => React.createElement("button", null, "Theme"),
    },
    "@/components/ui": { Logo: () => "trybe." },
    "@/lib/legal": legal,
  });
  for (const path of ["../app/terms/page.tsx", "../app/privacy/page.tsx"]) {
    const page = compile(path, {
      "next/link": link,
      "@/components/legal/policy-page": layout,
      "@/lib/legal": legal,
    });
    const html = renderToStaticMarkup(React.createElement(page.default));
    assert.match(html, /mailto:itighiseemmanuele@gmail.com/);
    assert.match(html, /Proposed policy/);
    assert.match(html, /history/);
    assert.doesNotMatch(html, /juve\.events/);
  }
});
