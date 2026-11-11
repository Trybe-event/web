import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function identityHarness(getProfile, accountName = "Emmanuel Itighise") {
  let profileIdentity = null;
  let pathname = "/attendee";
  let effect;
  let cleanup;
  const requests = [];
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useState: () => [
        profileIdentity,
        (value) => {
          profileIdentity = value;
        },
      ],
      useEffect: (callback) => {
        effect = callback;
      },
    },
    "next/link": { __esModule: true, default: "a" },
    "next/navigation": { usePathname: () => pathname },
    "@/components/ui": { Avatar: "Avatar" },
    "@/components/auth/sign-out": { SignOut: "SignOut" },
    "@/lib/api/client": {
      api: {
        GET: (path, options) => {
          requests.push({ path, options });
          return getProfile();
        },
      },
    },
  };
  const javascript = ts.transpileModule(
    readFileSync(
      new URL("../components/attendee/account-identity.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
    AbortController,
    AbortSignal,
  })(
    (name) => {
      if (!(name in dependencies)) throw new Error(name);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== "object") return [];
    return [value, ...nodes(value.props?.children)];
  }
  function render() {
    return nodes(loaded.exports.AttendeeAccountIdentity({ accountName }));
  }
  function find(type) {
    return render().find((node) => node.type === type)?.props;
  }
  function load(nextPath = pathname) {
    pathname = nextPath;
    cleanup?.();
    render();
    cleanup = effect();
  }
  return {
    find,
    load,
    requests,
    cleanup: () => cleanup?.(),
    serialized: () => JSON.stringify(render()),
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("sidebar initially shows only the first name and keeps the full name for the tooltip", () => {
  const harness = identityHarness(async () => ({ data: null }));
  assert.equal(harness.find("strong").children, "Emmanuel");
  assert.equal(harness.find("strong").title, "Emmanuel Itighise");
  assert.equal(harness.find("small").children, "Attendee workspace");
  assert.equal(harness.find("Avatar").name, "Emmanuel");
  assert.equal(harness.find("Avatar").src, undefined);
  assert.equal(harness.find("SignOut").iconOnly, true);
});

test("saved own-profile photo replaces the initial and private contact values are not rendered", async () => {
  const harness = identityHarness(async () => ({
    data: {
      full_name: "Ada Okafor",
      photo_url: "https://storage.example/avatar.webp",
      links: [{ value: "hidden@example.com" }],
    },
  }));
  harness.load();
  await flush();
  assert.equal(harness.requests[0].path, "/me/profile");
  assert.ok(harness.requests[0].options.signal instanceof AbortSignal);
  assert.equal(
    harness.find("Avatar").src,
    "https://storage.example/avatar.webp",
  );
  assert.equal(harness.find("Avatar").name, "Ada");
  assert.equal(harness.find("strong").children, "Ada");
  assert.doesNotMatch(harness.serialized(), /hidden@example/);
  harness.cleanup();
});

test("returning from profile editing reloads the saved photo and stale navigation responses cannot replace it", async () => {
  let firstResponse;
  let calls = 0;
  const harness = identityHarness(() =>
    ++calls === 1
      ? new Promise((resolve) => {
          firstResponse = resolve;
        })
      : Promise.resolve({
          data: {
            full_name: "Emmanuel Itighise",
            photo_url: "https://storage.example/new.webp",
          },
        }),
  );
  harness.load("/attendee/profile/edit");
  harness.load("/attendee/profile/preview");
  await flush();
  assert.equal(harness.requests[0].options.signal.aborted, true);
  firstResponse({
    data: {
      full_name: "Old Name",
      photo_url: "https://storage.example/old.webp",
    },
  });
  await flush();
  assert.equal(harness.find("Avatar").src, "https://storage.example/new.webp");
  assert.equal(harness.find("strong").children, "Emmanuel");
  harness.cleanup();
});

test("missing profiles and failed reads retain the account initial without inventing a photo", async () => {
  for (const getProfile of [
    async () => ({ data: undefined }),
    async () => {
      throw new Error("Unavailable");
    },
  ]) {
    const harness = identityHarness(getProfile, "  Alex   Attendee  ");
    harness.load();
    await flush();
    assert.equal(harness.find("strong").children, "Alex");
    assert.ok(!harness.find("Avatar").src);
    harness.cleanup();
  }
});
