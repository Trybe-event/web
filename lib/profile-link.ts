export function isWebsiteLink(kind: string): boolean {
  return kind === "linkedin" || kind === "portfolio" || kind === "other";
}

export function hasLinkScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value.trim());
}

export function normalizeProfileLink(kind: string, value: string): string {
  const trimmedValue = value.trim();
  if (
    !isWebsiteLink(kind) ||
    !trimmedValue ||
    hasLinkScheme(trimmedValue) ||
    trimmedValue.startsWith("//")
  )
    return trimmedValue;
  return `https://${trimmedValue}`;
}
