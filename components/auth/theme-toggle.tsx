"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  parseThemePreference,
  resolveTheme,
  themePreferences,
  type ThemePreference,
} from "@/lib/theme";

const themeLabels = { light: "Light", system: "System", dark: "Dark" } as const;
const themeIcons = { light: Sun, system: Monitor, dark: Moon } as const;

function subscribe(callback: () => void) {
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("trybe-theme", callback);
  systemTheme.addEventListener("change", callback);
  return () => {
    window.removeEventListener("trybe-theme", callback);
    systemTheme.removeEventListener("change", callback);
  };
}

function getThemeSnapshot() {
  const preference = parseThemePreference(
    document.documentElement.dataset.theme,
  );
  return `${preference}:${resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches)}`;
}

// A primitive snapshot stays stable between changes. A fresh object here would
// repeatedly re-render every consumer of this external store.
function getServerSnapshot() {
  return "system:light";
}

function persistThemePreference(next: ThemePreference) {
  document.documentElement.dataset.theme = next;
  document.cookie = `trybe_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("trybe-theme"));
}

export function ThemeToggle() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerSnapshot,
  );
  const preference = parseThemePreference(snapshot.split(":")[0]);
  const TriggerIcon = snapshot.endsWith(":dark") ? Moon : Sun;
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    function closeOutside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function chooseTheme(next: ThemePreference) {
    persistThemePreference(next);
    setOpen(false);
    trigger.current?.focus();
  }

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const choices = Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]',
      ) ?? [],
    );
    const selectedIndex = choices.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex: number;
    if (event.key === "ArrowDown")
      nextIndex = (selectedIndex + 1) % choices.length;
    else if (event.key === "ArrowUp")
      nextIndex = (selectedIndex - 1 + choices.length) % choices.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = choices.length - 1;
    else return;
    event.preventDefault();
    choices[nextIndex]?.focus();
  }

  return (
    <div className="theme-picker" ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        className="theme-button"
        aria-label={`Choose color theme. Current setting: ${themeLabels[preference]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <TriggerIcon size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Color theme"
          className="theme-menu"
          onKeyDown={navigateMenu}
        >
          {themePreferences.map((choice) => {
            const Icon = themeIcons[choice];
            return (
              <button
                key={choice}
                type="button"
                role="menuitemradio"
                aria-checked={preference === choice}
                tabIndex={preference === choice ? 0 : -1}
                onClick={() => chooseTheme(choice)}
                className="theme-option"
              >
                <Icon size={17} aria-hidden="true" />
                <span>{themeLabels[choice]}</span>
                {preference === choice && (
                  <Check size={16} aria-hidden="true" className="theme-check" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
