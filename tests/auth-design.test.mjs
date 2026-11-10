import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}, globals = {}) {
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
  const loaded = { exports: {} };
  vm.runInNewContext(
    `(function(require,module,exports){${javascript}\n})`,
    globals,
  )((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}
const theme = compile("../lib/theme.ts");

test("system follows the device while explicit choices override it and invalid cookies fall back safely", () => {
  for (const value of [undefined, null, "system", "auto", "invalid"])
    assert.equal(theme.parseThemePreference(value), "system");
  assert.equal(theme.resolveTheme("system", true), "dark");
  assert.equal(theme.resolveTheme("system", false), "light");
  assert.equal(theme.resolveTheme("light", true), "light");
  assert.equal(theme.resolveTheme("dark", false), "dark");
});

function walk(element, predicate) {
  if (!element || typeof element !== "object") return [];
  return [
    ...(predicate(element) ? [element] : []),
    ...React.Children.toArray(element.props?.children).flatMap((child) =>
      walk(child, predicate),
    ),
  ];
}
function themeHarness(preference = "system", systemIsDark = false) {
  const states = [],
    refs = [],
    effects = [];
  const handlers = new Map(),
    windowHandlers = new Map(),
    mediaHandlers = new Set();
  const buttonCache = new Map();
  let stateIndex = 0,
    refIndex = 0,
    previousOpen,
    tree,
    store,
    notifications = 0;
  const media = {
    matches: systemIsDark,
    addEventListener: (name, callback) => {
      assert.equal(name, "change");
      mediaHandlers.add(callback);
    },
    removeEventListener: (name, callback) => {
      assert.equal(name, "change");
      mediaHandlers.delete(callback);
    },
  };
  const document = {
    documentElement: { dataset: { theme: preference } },
    cookie: "",
    activeElement: null,
    addEventListener: (name, callback) => handlers.set(name, callback),
    removeEventListener: (name) => handlers.delete(name),
  };
  const window = {
    matchMedia: () => media,
    addEventListener: (name, callback) => windowHandlers.set(name, callback),
    removeEventListener: (name) => windowHandlers.delete(name),
    dispatchEvent: (event) => windowHandlers.get(event.type)?.(),
  };
  const { ThemeToggle } = compile(
    "../components/auth/theme-toggle.tsx",
    {
      "@/lib/theme": theme,
      react: {
        ...React,
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [
            states[index],
            (value) => {
              states[index] = value;
            },
          ];
        },
        useRef(initial) {
          const index = refIndex++;
          return (refs[index] ??= { current: initial });
        },
        useId: () => "theme-menu-test",
        useEffect(callback, dependencies) {
          if (dependencies[0] !== previousOpen) {
            effects.push(callback);
            previousOpen = dependencies[0];
          }
        },
        useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          store = { subscribe, getSnapshot, getServerSnapshot };
          return getSnapshot();
        },
      },
    },
    { window, document, location: { protocol: "https:" }, Event },
  );
  let cleanup, unsubscribe;
  function render() {
    stateIndex = 0;
    refIndex = 0;
    tree = ThemeToggle();
    const allButtons = walk(tree, (element) => element.type === "button");
    const nativeButtons = allButtons.map((element) => {
      const key =
        element.props.role === "menuitemradio" ? element.key : "trigger";
      let button = buttonCache.get(key);
      if (!button) {
        button = {
          focus() {
            document.activeElement = this;
          },
        };
        buttonCache.set(key, button);
      }
      button.element = element;
      return button;
    });
    const choices = nativeButtons.filter(
      (button) => button.element.props.role === "menuitemradio",
    );
    refs[0].current = { contains: (target) => nativeButtons.includes(target) };
    refs[1].current = nativeButtons[0];
    refs[2].current = choices.length
      ? {
          querySelector: () =>
            choices.find((button) => button.element.props["aria-checked"]),
          querySelectorAll: () => choices,
        }
      : null;
    while (effects.length) {
      cleanup?.();
      cleanup = effects.shift()();
    }
    if (!unsubscribe) unsubscribe = store.subscribe(() => notifications++);
    return tree;
  }
  render();
  return {
    render,
    document,
    media,
    handlers,
    windowHandlers,
    mediaHandlers,
    get tree() {
      return tree;
    },
    get store() {
      return store;
    },
    get notifications() {
      return notifications;
    },
    open() {
      walk(tree, (element) => element.type === "button")[0].props.onClick();
      render();
    },
    options() {
      return walk(tree, (element) => element.props?.role === "menuitemradio");
    },
    select(index) {
      this.options()[index].props.onClick();
      render();
    },
    key(key) {
      const menu = walk(tree, (element) => element.props?.role === "menu")[0];
      menu.props.onKeyDown({ key, preventDefault() {} });
      render();
    },
    destroy() {
      cleanup?.();
      unsubscribe?.();
    },
  };
}

test("theme menu exposes three radio choices, persists preference and follows device changes without unstable snapshots", () => {
  const picker = themeHarness();
  assert.equal(typeof picker.store.getSnapshot(), "string");
  assert.equal(picker.store.getSnapshot(), picker.store.getSnapshot());
  assert.equal(picker.store.getServerSnapshot(), "system:light");
  picker.open();
  assert.equal(picker.options().length, 3);
  assert.equal(
    picker.options().filter((option) => option.props["aria-checked"]).length,
    1,
  );
  assert.equal(
    picker.document.activeElement.element.props["aria-checked"],
    true,
  );
  picker.select(2);
  assert.equal(picker.document.documentElement.dataset.theme, "dark");
  assert.match(
    picker.document.cookie,
    /^trybe_theme=dark;.*SameSite=Lax; Secure$/,
  );
  assert.equal(picker.options().length, 0);
  picker.open();
  picker.select(1);
  assert.match(picker.document.cookie, /^trybe_theme=system;/);
  picker.media.matches = true;
  for (const callback of picker.mediaHandlers) callback();
  assert.equal(picker.store.getSnapshot(), "system:dark");
  assert.ok(picker.notifications > 0);
  picker.open();
  picker.select(0);
  assert.equal(picker.store.getSnapshot(), "light:light");
  picker.destroy();
  assert.equal(picker.mediaHandlers.size, 0);
  assert.equal(picker.windowHandlers.size, 0);
});

test("menu supports arrow/home/end navigation, outside dismissal and Escape with focus restoration and cleanup", () => {
  const picker = themeHarness("system");
  picker.open();
  picker.key("End");
  assert.equal(
    picker.document.activeElement.element.props.children[1].props.children,
    "Dark",
  );
  picker.key("ArrowDown");
  assert.equal(
    picker.document.activeElement.element.props.children[1].props.children,
    "Light",
  );
  picker.key("ArrowUp");
  assert.equal(
    picker.document.activeElement.element.props.children[1].props.children,
    "Dark",
  );
  picker.key("Home");
  assert.equal(
    picker.document.activeElement.element.props.children[1].props.children,
    "Light",
  );
  picker.handlers.get("keydown")({ key: "Escape", preventDefault() {} });
  picker.render();
  assert.equal(picker.options().length, 0);
  assert.equal(
    picker.document.activeElement.element.props["aria-haspopup"],
    "menu",
  );
  assert.equal(picker.handlers.size, 0);
  picker.open();
  picker.handlers.get("pointerdown")({ target: {} });
  picker.render();
  assert.equal(picker.options().length, 0);
  picker.open();
  picker.key("Tab");
  assert.equal(picker.options().length, 0);
  picker.destroy();
  assert.equal(picker.handlers.size, 0);
});

test("both auth roles render their own portrait and product copy with the shared team support address", () => {
  const link = {
    default: ({ children, ...props }) =>
      React.createElement("a", props, children),
    __esModule: true,
  };
  const { AuthShell } = compile("../components/auth/auth-shell.tsx", {
    "next/link": link,
    "next/image": {
      default: ({ src, alt, className }) =>
        React.createElement("img", { src, alt, className }),
      __esModule: true,
    },
    "@/components/ui": { Logo: () => "trybe." },
    "@/lib/legal": compile("../lib/legal.ts"),
    "./theme-toggle": {
      ThemeToggle: () => React.createElement("button", null, "Theme"),
    },
  });
  for (const type of ["attendee", "organizer"]) {
    const html = renderToStaticMarkup(
      React.createElement(AuthShell, { type }, "Existing account form"),
    );
    assert.ok(html.includes(`/images/auth/${type}-portrait.webp`));
    assert.match(html, /Fostering connection with convenience/);
    assert.match(html, /mailto:trybevent@gmail.com/);
    assert.match(html, /Existing account form/);
    assert.match(
      html,
      type === "organizer" ? /feel like a community/ : /Keep the conversation/,
    );
  }
});

test("portrait assets have a 2:3 frame and 4K-height export without a stretched aspect ratio", async () => {
  for (const role of ["attendee", "organizer"]) {
    const metadata = await sharp(
      fileURLToPath(
        new URL(`../public/images/auth/${role}-portrait.webp`, import.meta.url),
      ),
    ).metadata();
    assert.equal(metadata.width, 2560);
    assert.equal(metadata.height, 3840);
    assert.equal(metadata.width / metadata.height, 2 / 3);
  }
});
