export const themePreferences = ["light", "system", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemIsDark: boolean,
): "light" | "dark" {
  return preference === "system"
    ? systemIsDark
      ? "dark"
      : "light"
    : preference;
}
