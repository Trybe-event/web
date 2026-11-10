import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function compile(path, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(
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
  vm.runInNewContext(
    `(function(require,module,exports){${source}\n})`,
    globals,
  )((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}
const policy = compile("../lib/event-artwork.ts");
function harness(navigator) {
  const slots = [];
  let cursor = 0;
  let previousDependencies;
  let cleanup;
  const effects = [];
  const component = compile(
    "../components/events/event-sharing.tsx",
    {
      react: {
        useState(initial) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = initial;
          return [
            slots[index],
            (value) => {
              slots[index] =
                typeof value === "function" ? value(slots[index]) : value;
            },
          ];
        },
        useEffect(callback, dependencies) {
          if (
            JSON.stringify(dependencies) !==
            JSON.stringify(previousDependencies)
          ) {
            cleanup?.();
            effects.push(callback);
            previousDependencies = dependencies;
          }
        },
      },
      "next/image": { default: "img", __esModule: true },
      "lucide-react": {
        Copy: "icon",
        Download: "icon",
        ImageIcon: "icon",
        Share2: "icon",
      },
      "@/components/ui": {
        Alert: "alert",
        Button: "button",
        Dialog: "dialog",
        Input: "input",
      },
      "@/lib/event-artwork": policy,
    },
    {
      navigator,
      URL,
      File,
      Blob,
      AbortController,
      Error,
      fetch: async () =>
        new Response(new Blob(["png"], { type: "image/png" }), {
          headers: { "content-type": "image/png" },
        }),
    },
  ).EventSharing;
  function render() {
    cursor = 0;
    const tree = component({
      slug: "abc123",
      name: "Design & code",
      url: "https://trybe.example/abc123",
    });
    while (effects.length) cleanup = effects.shift()();
    return tree;
  }
  return { render, close: () => cleanup?.() };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [
    tree,
    ...[tree.props?.children, tree.props?.actions]
      .flat(Infinity)
      .flatMap(nodes),
  ];
}
function text(tree) {
  if (typeof tree === "string") return tree;
  if (!tree || typeof tree !== "object") return "";
  return [tree.props?.children].flat(Infinity).map(text).join("");
}
function button(tree, label) {
  return nodes(tree).find(
    (node) => node.type === "button" && text(node).trim() === label,
  );
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("share invokes the native sheet immediately with the event URL", async () => {
  const calls = [];
  const view = harness({ share: async (data) => calls.push(data) });
  button(view.render(), "Share").props.onClick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://trybe.example/abc123");
  assert.equal(calls[0].title, "Design & code");
  await flush();
  assert.equal(
    nodes(view.render()).find((node) => node.type === "dialog").props.open,
    false,
  );
});
test("cancelling native sharing is silent; unsupported sharing opens the fallback", async () => {
  const cancelled = harness({
    share: async () => {
      const error = new Error("cancelled");
      error.name = "AbortError";
      throw error;
    },
  });
  button(cancelled.render(), "Share").props.onClick();
  await flush();
  assert.equal(
    nodes(cancelled.render()).find((node) => node.type === "dialog").props.open,
    false,
  );
  const fallback = harness({});
  button(fallback.render(), "Share").props.onClick();
  const tree = fallback.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "dialog").props.open,
    true,
  );
  assert.ok(button(tree, "Copy link"));
  fallback.close();
});
test("image sharing includes a prepared PNG and the invitation link", async () => {
  const calls = [];
  const view = harness({
    share: async (data) => calls.push(data),
    canShare: ({ files }) => files?.[0]?.type === "image/png",
  });
  button(view.render(), "Event artwork").props.onClick();
  view.render();
  await flush();
  await flush();
  const tree = view.render();
  assert.equal(button(tree, "Share image").props.disabled, false);
  button(tree, "Share image").props.onClick();
  assert.equal(calls[0].files[0].name, "abc123-post.png");
  assert.match(calls[0].text, /https:\/\/trybe.example\/abc123/);
  view.close();
});
test("copy failures retain a selectable link and social URLs encode names safely", async () => {
  const view = harness({
    clipboard: {
      writeText: async () => {
        throw new Error("denied");
      },
    },
  });
  button(view.render(), "Share").props.onClick();
  let tree = view.render();
  button(tree, "Copy link").props.onClick();
  await flush();
  tree = view.render();
  assert.match(text(tree), /Select and copy/);
  assert.ok(
    nodes(tree).some(
      (node) =>
        node.type === "input" &&
        node.props.readOnly &&
        node.props.value === "https://trybe.example/abc123",
    ),
  );
  const links = policy.eventShareLinks(
    "https://trybe.example/abc123",
    "Code & design #2026",
  );
  assert.equal(
    new URL(links.whatsapp).searchParams.get("text"),
    "Code & design #2026\nhttps://trybe.example/abc123",
  );
  assert.equal(
    new URL(links.linkedin).searchParams.get("url"),
    "https://trybe.example/abc123",
  );
  view.close();
});

test("unsupported file sharing does not silently replace the image with a bare link", async () => {
  const calls = [];
  const view = harness({
    share: async (data) => calls.push(data),
    canShare: () => false,
  });
  button(view.render(), "Event artwork").props.onClick();
  view.render();
  await flush();
  await flush();
  button(view.render(), "Share image").props.onClick();
  await flush();
  assert.equal(calls.length, 0);
  assert.match(text(view.render()), /cannot share image files/);
  view.close();
});
