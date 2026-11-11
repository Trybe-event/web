import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";

const require = createRequire(import.meta.url);
function compile(file, dependencies, globals = {}) {
  const javascript = ts.transpileModule(
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
  const loadedModule = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
    Intl,
    Date,
    URL,
    AbortSignal,
    ...globals,
  })(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const draftModel = compile("../lib/event-form.ts", {});
const publication = compile("../lib/event-publication.ts", {
  "./event-form": draftModel,
});
const setup = compile("../lib/event-setup.ts", {
  "./event-publication": publication,
});
const completeEvent = {
  id: "owned-event",
  status: "draft",
  name: "Build Day",
  format: "physical",
  timezone: "Africa/Lagos",
  starts_at: "2027-01-01T09:00:00Z",
  ends_at: "2027-01-01T17:00:00Z",
  venue_name: "Studio",
  venue_address: "Lagos",
  summary: "A day for builders",
  description: "Meet and build together.",
  visibility: "private",
};
function editorHarness({
  event = completeEvent,
  creation = false,
  saveFails = false,
} = {}) {
  const slots = [];
  let cursor = 0;
  let tree;
  let effects = [];
  let subscription;
  let values = {};
  const calls = [];
  const replacements = [];
  const errors = {};
  const same = (left, right) =>
    left?.length === right?.length &&
    left.every((value, index) => Object.is(value, right[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies))
        slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!dependencies || !same(slots[index]?.dependencies, dependencies)) {
        const cleanup = slots[index]?.cleanup;
        slots[index] = { dependencies };
        effects.push(() => {
          cleanup?.();
          slots[index].cleanup = callback();
        });
      }
    },
  };
  const form = {
    control: {},
    formState: { errors },
    register: (name) => ({ name }),
    getValues: () => values,
    reset(next) {
      values = next;
    },
    trigger: async () => draftModel.eventDraftSchema.safeParse(values).success,
    setError(name, details) {
      errors[name] = details;
    },
    setFocus() {},
    subscribe({ callback }) {
      subscription = callback;
      return () => {
        subscription = undefined;
      };
    },
  };
  const router = { replace: (url) => replacements.push(url), refresh() {} };
  const storage = new Map();
  const { EventForm } = compile(
    "../components/organizer/event-form.tsx",
    {
      react: hooks,
      "@hookform/resolvers/zod": { zodResolver: () => () => ({}) },
      "next/navigation": {
        useRouter: () => router,
        useSearchParams: () => ({ get: () => null }),
      },
      "next/image": "img",
      "react-hook-form": {
        FormProvider: "form-provider",
        useForm: () => form,
        useWatch: () => values,
      },
      "@/lib/event-setup": setup,
      "@/lib/event-form": draftModel,
      "./event-editor-context": { EventEditorContext: "editor-provider" },
      "./program-builder": { ProgramBuilder: "program-builder" },
      "./event-setup-panels": {
        EventRegistrationSettings: "registration-settings",
        EventExperienceSettings: "experience-settings",
        EventPagePreview: "page-preview",
        EventTicketNotice: "ticket-notice",
      },
      "@/components/ui": {
        Alert: "alert",
        Button: "button",
        Card: "section",
        Field: "field",
        Input: "input",
        Skeleton: "skeleton",
      },
      "@/lib/api/client": {
        errorMessage: (error) => error?.message || "Request failed",
        fieldErrors: () => ({}),
        api: Object.fromEntries(
          ["GET", "POST", "PATCH"].map((method) => [
            method,
            async (path, options) => {
              calls.push({ method, path, options });
              if (method === "PATCH" && saveFails)
                return {
                  response: { ok: false },
                  error: { message: "Save unavailable" },
                };
              return {
                response: { ok: true },
                data: { ...event, ...(method === "PATCH" ? options.body : {}) },
              };
            },
          ]),
        ),
      },
    },
    {
      crypto: { randomUUID: () => "creation-key" },
      sessionStorage: {
        getItem: (key) => storage.get(key),
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      setTimeout: () => 1,
      clearTimeout() {},
      requestAnimationFrame: (callback) => callback(),
      window: {
        addEventListener() {},
        removeEventListener() {},
        matchMedia: () => ({ matches: true }),
      },
    },
  );
  function walk(node, predicate) {
    if (!node || typeof node !== "object") return [];
    return [
      ...(predicate(node) ? [node] : []),
      ...React.Children.toArray(node.props?.children).flatMap((child) =>
        walk(child, predicate),
      ),
    ];
  }
  function render() {
    cursor = 0;
    tree = EventForm({
      organizerId: "owner",
      ...(creation ? {} : { eventId: event.id }),
      settings: "Actual review",
    });
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return tree;
  }
  async function settle() {
    await new Promise((resolve) => setImmediate(resolve));
    render();
  }
  render();
  return {
    render,
    settle,
    calls,
    replacements,
    errors,
    find: (predicate) => walk(tree, predicate),
    edit(patch) {
      values = { ...values, ...patch };
      subscription?.();
      render();
    },
    active() {
      return walk(
        tree,
        (node) =>
          node.type === "button" && node.props["aria-current"] === "step",
      )[0];
    },
    async go(index) {
      const nav = walk(tree, (node) => node.type === "nav")[0];
      nav.props.children[index].props.onClick();
      await settle();
    },
  };
}

test("new draft uses one idempotency key and enters its canonical event editor", async () => {
  const view = editorHarness({ creation: true });
  await view.settle();
  const creates = view.calls.filter((call) => call.method === "POST");
  assert.equal(creates.length, 1);
  assert.equal(
    creates[0].options.params.header["Idempotency-Key"],
    "creation-key",
  );
  assert.deepEqual(view.replacements, ["/organizer/events/owned-event/edit"]);
});

test("six-step navigation retains draft fields, blocks missing earlier details and does not create or publish another event", async () => {
  const view = editorHarness();
  await view.settle();
  view.edit({ name: "" });
  await view.go(5);
  assert.equal(view.active().props.children.at(-1), "Event details");
  assert.match(view.errors.name.message, /Complete this field/);
  view.edit({ name: "Updated Build Day" });
  await view.go(1);
  assert.equal(view.active().props.children.at(-1), "Tickets");
  await view.go(5);
  assert.equal(view.active().props.children.at(-1), "Review");
  const patches = view.calls.filter((call) => call.method === "PATCH");
  assert.equal(patches.length, 1);
  assert.equal(patches[0].options.body.name, "Updated Build Day");
  assert.equal(view.calls.filter((call) => call.method === "POST").length, 0);
  assert.equal(
    view.find((node) => node.type === "section" && node.props.hidden === false)
      .length,
    1,
  );
  assert.equal(
    view.find((node) => node.type === "section" && node.props.hidden === true)
      .length,
    5,
  );
});

test("failed saves keep the active panel and edits available for retry", async () => {
  const view = editorHarness({ saveFails: true });
  await view.settle();
  view.edit({ name: "Keep these unsaved edits" });
  await view.go(1);
  assert.equal(view.active().props.children.at(-1), "Event details");
  assert.equal(
    view.calls.filter((call) => call.method === "PATCH")[0].options.body.name,
    "Keep these unsaved edits",
  );
  assert.equal(view.find((node) => node.type === "alert").length > 0, true);
});

test("unfinished program edits send forward navigation back to the editable program panel", async () => {
  const view = editorHarness();
  await view.settle();
  view
    .find((node) => node.type === "editor-provider")[0]
    .props.value.setSectionBusy("program", true);
  view.render();
  await view.go(5);
  assert.equal(view.active().props.children.at(-1), "Experience");
  assert.equal(view.calls.filter((call) => call.method === "POST").length, 0);
});

test("published setup exposes the agenda and future tools as tabs while preserving one saved event", async () => {
  const view = editorHarness({
    event: { ...completeEvent, status: "published" },
  });
  await view.settle();
  const nav = view.find((node) => node.type === "nav")[0];
  assert.equal(nav.props.children.length, 9);
  await view.go(4);
  assert.equal(view.active().props.children.at(-1), "Agenda & lineup");
  assert.equal(view.find((node) => node.type === "program-builder").length, 1);
  assert.equal(view.calls.filter((call) => call.method === "POST").length, 0);
});
