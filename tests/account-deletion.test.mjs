import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function deletionHarness(deleteAccount) {
  const state = [
    {
      full_name: "Test Attendee",
      role: "Engineer",
      bio: "Builder",
      skills: [],
      interests: [],
      links: [],
    },
  ];
  const requests = [];
  const navigations = [];
  let hookIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: {
      useEffect() {},
      useState(initial) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = value;
          },
        ];
      },
      useRef(initial) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = { current: initial };
        return state[index];
      },
    },
    "next/navigation": {
      useRouter: () => ({ replace: (path) => navigations.push(path) }),
    },
    "@/components/ui": Object.fromEntries(
      [
        "Alert",
        "Avatar",
        "Badge",
        "Button",
        "ButtonLink",
        "Card",
        "Skeleton",
        "Dialog",
        "Field",
        "Input",
      ].map((name) => [name, name]),
    ),
    "@/lib/api/client": {
      api: {
        DELETE: async (path) => {
          requests.push(path);
          return deleteAccount();
        },
      },
      errorMessage: () => "Deletion failed. Try again.",
    },
    "./labels": { LINK_LABELS: {}, VISIBILITY_LABELS: {} },
    "@/components/attendee/profile-menu": {
      AttendeeProfileMenu: "ProfileMenu",
    },
    "@/components/auth/sign-out": { SignOut: "SignOut" },
    "@/components/ui/portfolio-link": { PortfolioLink: "PortfolioLink" },
  };
  const javascript = ts.transpileModule(
    readFileSync(
      new URL("../app/attendee/profile/profile-home.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
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
    return [
      value,
      ...nodes(value.props?.children),
      ...nodes(value.props?.actions),
    ];
  }
  function render() {
    hookIndex = 0;
    return nodes(loaded.exports.ProfileHome());
  }
  function find(type, text) {
    const result = render().find(
      (node) =>
        node.type === type &&
        (text === undefined || node.props.children === text),
    );
    assert.ok(result, `${type} ${text ?? ""} exists`);
    return result.props;
  }
  function enterPhrase(value) {
    find("Field")
      .children({ id: "confirmation" })
      .props.onChange({ target: { value } });
  }
  function openReview() {
    find("Button", "Delete account").onClick();
    enterPhrase("DELETE MY ACCOUNT");
    find("Button", "Review deletion").onClick();
  }
  return { find, render, enterPhrase, openReview, requests, navigations };
}

test("account deletion requires exact typing, review and acknowledgment", async () => {
  const harness = deletionHarness(async () => ({ response: { ok: true } }));
  harness.find("Button", "Delete account").onClick();
  assert.equal(harness.find("Button", "Review deletion").disabled, true);
  harness.enterPhrase("delete my account");
  assert.equal(harness.find("Button", "Review deletion").disabled, true);
  harness.enterPhrase("DELETE MY ACCOUNT");
  assert.equal(harness.find("Button", "Review deletion").disabled, false);
  harness.find("Button", "Review deletion").onClick();
  const finalAction = harness.find("Button", "Permanently delete my account");
  assert.equal(finalAction.disabled, true);
  await finalAction.onClick();
  assert.equal(harness.requests.length, 0);
  harness.find("input").onChange({ target: { checked: true } });
  await harness.find("Button", "Permanently delete my account").onClick();
  assert.deepEqual(harness.requests, ["/me"]);
  assert.deepEqual(harness.navigations, ["/attendee/sign-in"]);
});

test("cancel and reopen erase previous consent", () => {
  const harness = deletionHarness(async () => assert.fail("Must not delete"));
  harness.openReview();
  harness.find("input").onChange({ target: { checked: true } });
  harness.find("Button", "Cancel").onClick();
  harness.find("Button", "Delete account").onClick();
  assert.equal(
    harness.find("Field").children({ id: "confirmation" }).props.value,
    "",
  );
  assert.equal(harness.find("Button", "Review deletion").disabled, true);
  assert.equal(harness.requests.length, 0);
});

test("duplicate clicks send one request and failures keep the review available for retry", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const harness = deletionHarness(() => pending);
  harness.openReview();
  harness.find("input").onChange({ target: { checked: true } });
  const action = harness.find("Button", "Permanently delete my account");
  const first = action.onClick();
  await action.onClick();
  assert.equal(harness.requests.length, 1);
  assert.equal(
    harness.find("Button", "Permanently delete my account").loading,
    true,
  );
  finish({ response: { ok: false }, error: { code: "unavailable" } });
  await first;
  assert.equal(harness.find("Dialog").open, true);
  assert.equal(
    harness.find("Button", "Permanently delete my account").disabled,
    false,
  );
  assert.equal(harness.navigations.length, 0);
});
