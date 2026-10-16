import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/authentication-errors.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  authenticationErrorDetail,
  assertAuthenticationSucceeded,
  AuthenticationActionError,
} = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("Clerk 422 errors retain their actual validation explanation", () => {
  const error = {
    status: 422,
    clerkError: true,
    message: "API request failed",
    errors: [
      {
        code: "form_password_pwned",
        longMessage:
          "Choose a different password; this one has appeared in a data breach.",
      },
    ],
  };
  assert.equal(
    authenticationErrorDetail(error).message,
    error.errors[0].longMessage,
  );
  assert.throws(
    () => assertAuthenticationSucceeded({ error }),
    (caught) =>
      caught instanceof AuthenticationActionError &&
      caught.detail.code === "form_password_pwned" &&
      caught.message === error.errors[0].longMessage,
  );
});
test("raw Clerk password-length responses retain the configured minimum", () => {
  const error = {
    errors: [
      {
        message: "Passwords must be 15 characters or more.",
        long_message: "Passwords must be 15 characters or more.",
        code: "form_password_length_too_short",
      },
    ],
  };
  assert.equal(
    authenticationErrorDetail(error).message,
    "Passwords must be 15 characters or more.",
  );
});

test("wrapped SDK errors expose field details instead of the wrapper message", () => {
  assert.equal(
    authenticationErrorDetail({
      cause: {
        errors: [
          {
            code: "form_param_format_invalid",
            message: "Enter a valid email address.",
          },
        ],
      },
    }).message,
    "Enter a valid email address.",
  );
  assert.match(
    authenticationErrorDetail({
      cause: { errors: [{ code: "form_identifier_exists" }] },
    }).message,
    /already exists/,
  );
});
test("provider password rejection stays rejected even when local requirements pass", () => {
  assert.throws(
    () =>
      assertAuthenticationSucceeded({
        error: { errors: [{ code: "form_password_pwned" }] },
      }),
    /data breach/,
  );
  assert.doesNotThrow(() => assertAuthenticationSucceeded({ error: null }));
});
test("developer exception messages and metadata are not shown", () => {
  const error = new Error("request includes a sensitive token");
  error.cause = error;
  assert.equal(
    authenticationErrorDetail(error).message,
    "We couldn't complete that step. Please try again.",
  );
  assert.equal(
    authenticationErrorDetail({
      errors: [{ code: "unknown_error", meta: { secret: "not for display" } }],
    }).message,
    "We couldn't complete that step. Please try again.",
  );
});
