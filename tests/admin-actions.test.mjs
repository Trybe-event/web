import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

function loadModule(relative, dependencies = {}) {
  const javascript = ts.transpileModule(
    fs.readFileSync(new URL(relative, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
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

function harness(post) {
  const slots = [];
  let index = 0,
    refreshes = 0;
  const calls = [];
  const hooks = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots))
        slots[slot] = typeof initial === "function" ? initial() : initial;
      return [
        slots[slot],
        (value) => {
          slots[slot] =
            typeof value === "function" ? value(slots[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
  };
  const policy = loadModule("../lib/admin-reports.ts");
  const { ReportActions } = loadModule(
    "../app/admin/(workspace)/reports/[reportId]/report-actions.tsx",
    {
      react: hooks,
      "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
      "@/components/ui": Object.fromEntries(
        [
          "Alert",
          "Button",
          "Card",
          "Dialog",
          "Field",
          "Select",
          "Textarea",
        ].map((name) => [name, name]),
      ),
      "@/lib/admin-reports": policy,
      "@/lib/api/client": {
        api: {
          POST: async (path, options) => {
            calls.push({ path, options });
            return post();
          },
        },
        errorMessage: (error, fallback) => error?.message ?? fallback,
        fieldErrors: () => ({}),
      },
    },
  );
  return {
    calls,
    refreshes: () => refreshes,
    render() {
      index = 0;
      return ReportActions({ reportId: "report-id", reportStatus: "open" });
    },
  };
}

function find(node, type, label) {
  if (!node) return undefined;
  if (Array.isArray(node))
    return node.map((child) => find(child, type, label)).find(Boolean);
  if (typeof node === "function")
    return find(node({ id: "control" }), type, label);
  if (typeof node !== "object") return undefined;
  if (node.type === type && (!label || node.props.children === label))
    return node;
  return (
    find(node.props?.children, type, label) ??
    find(node.props?.actions, type, label)
  );
}
function prepare(access) {
  let tree = access.render();
  find(tree, "Select").props.onChange({ target: { value: "warn" } });
  find(tree, "Textarea").props.onChange({
    target: { value: "  Reviewed evidence  " },
  });
  tree = access.render();
  find(tree, "form").props.onSubmit({ preventDefault() {} });
  return access.render();
}

test("admin routing never adds a public account-registration choice", () => {
  const accounts = loadModule("../lib/account.ts");
  assert.deepEqual(Array.from(accounts.ACCOUNT_TYPES), [
    "organizer",
    "attendee",
  ]);
  assert.equal(accounts.isAccountType("admin"), false);
  assert.equal(accounts.workspacePath("admin"), "/admin");
});

test("moderation posts only after reason review and explicit confirmation, once while pending", async () => {
  let complete;
  const access = harness(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const tree = prepare(access);
  assert.equal(access.calls.length, 0);
  const confirm = find(tree, "Button", "Confirm action").props.onClick;
  const first = confirm();
  await confirm();
  assert.equal(access.calls.length, 1);
  assert.equal(access.calls[0].path, "/admin/reports/{reportId}/actions");
  assert.equal(access.calls[0].options.params.path.reportId, "report-id");
  assert.equal(access.calls[0].options.body.reason, "Reviewed evidence");
  assert.equal(access.calls[0].options.body.action, "warn");
  complete({ response: { ok: true }, data: { status: "actioned" } });
  await first;
  assert.equal(access.refreshes(), 1);
  assert.equal(find(access.render(), "Dialog").props.open, false);
});

test("an uncertain moderation response requires reload instead of another submission", async () => {
  const access = harness(() => {
    throw new Error("offline after submission");
  });
  const tree = prepare(access);
  await find(tree, "Button", "Confirm action").props.onClick();
  const after = access.render();
  assert.equal(find(after, "Button", "Review action").props.disabled, true);
  assert.ok(find(after, "Button", "Reload report before another action"));
  find(after, "form").props.onSubmit({ preventDefault() {} });
  assert.equal(access.calls.length, 1);
  assert.equal(access.refreshes(), 0);
});
