import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function compile(path, dependencies) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
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
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    AbortSignal,
    Response,
    URL,
  })(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
function deletionHarness(remove) {
  const slots = [];
  let cursor = 0;
  let refreshes = 0;
  const calls = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useTransition: () => [false, (callback) => callback()],
  };
  const { DeleteDraft } = compile("../components/organizer/delete-draft.tsx", {
    react,
    "@/components/ui": { Button: "button", Dialog: "dialog", Alert: "alert" },
    "next/navigation": {
      useRouter: () => ({
        refresh() {
          refreshes++;
        },
      }),
    },
    "@/lib/api/client": {
      api: {
        DELETE: async (...args) => {
          calls.push(args);
          return remove();
        },
      },
      errorMessage: (error) => error?.message || "Request failed",
    },
  });
  function render() {
    cursor = 0;
    const tree = DeleteDraft({ eventId: "owned-draft", name: "Build Weekend" });
    const children = tree.props.children;
    return { button: children[0], dialog: children[1] };
  }
  return { render, calls, refreshes: () => refreshes };
}
test("draft deletion requires confirmation and repeated clicks make only one request", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const harness = deletionHarness(() => pending);
  let view = harness.render();
  assert.equal(view.dialog.props.open, false);
  assert.equal(harness.calls.length, 0);
  view.button.props.onClick();
  view = harness.render();
  assert.equal(view.dialog.props.open, true);
  assert.match(view.dialog.props.description, /permanently.*cannot be undone/i);
  const confirm = view.dialog.props.actions.props.children[1];
  confirm.props.onClick();
  confirm.props.onClick();
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0][1].params.path.eventId, "owned-draft");
  finish({ response: { ok: true, status: 204 } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.render().dialog.props.open, false);
  assert.equal(harness.refreshes(), 1);
});
test("a failed deletion preserves the confirmation and does not pretend the event disappeared", async () => {
  const harness = deletionHarness(async () => ({
    response: { ok: false, status: 409 },
    error: { message: "Published events cannot be deleted" },
  }));
  harness.render().button.props.onClick();
  harness.render().dialog.props.actions.props.children[1].props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  const view = harness.render();
  assert.equal(view.dialog.props.open, true);
  assert.equal(harness.refreshes(), 0);
  assert.equal(
    view.dialog.props.children.props.children,
    "Published events cannot be deleted",
  );
});
test("retrying an already deleted draft refreshes the list", async () => {
  const harness = deletionHarness(async () => ({
    response: { ok: false, status: 404 },
  }));
  harness.render().button.props.onClick();
  harness.render().dialog.props.actions.props.children[1].props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.refreshes(), 1);
});
test("email cover URLs resolve fresh signed images and never redirect unknown invitations", async () => {
  let data = {
    image_url: "https://storage.example.test/signed.jpg?expires=soon",
  };
  let status = 200;
  const { GET } = compile("../app/event-images/[slug]/route.ts", {
    "next/server": {
      NextResponse: {
        redirect: (url, options) =>
          new Response(null, {
            ...options,
            headers: { ...options.headers, Location: url.toString() },
          }),
      },
    },
    "@/lib/api/server": {
      serverApi: async () => ({
        GET: async () => ({ data, response: { ok: status === 200, status } }),
      }),
    },
  });
  const run = () =>
    GET(new Request("http://localhost:3000/event-images/abc123"), {
      params: Promise.resolve({ slug: "abc123" }),
    });
  let response = await run();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(
    response.headers.get("location"),
    /^https:\/\/storage.example.test/,
  );
  data = { image_url: "javascript:alert(1)" };
  assert.equal((await run()).status, 502);
  data = { image_url: null };
  assert.equal((await run()).status, 404);
  status = 404;
  assert.equal((await run()).status, 404);
  status = 500;
  assert.equal((await run()).status, 503);
});
