import type { Schemas } from "./api/client";

export function connectionAction(
  profile: Schemas["Profile"],
  networking: Schemas["WindowState"],
) {
  if (profile.relationship === "self")
    return { kind: "self", label: "This is your profile" } as const;
  if (profile.relationship === "connected")
    return { kind: "connected", label: "Connected" } as const;
  if (profile.relationship === "pending_outgoing")
    return { kind: "outgoing", label: "Request sent" } as const;
  if (profile.relationship === "pending_incoming")
    return { kind: "incoming", label: "They asked to connect" } as const;
  if (networking !== "open")
    return {
      kind: "unavailable",
      label:
        networking === "not_open"
          ? "Networking has not opened yet"
          : "Networking is closed",
    } as const;
  if (profile.accepting_requests === false)
    return {
      kind: "unavailable",
      label: "This attendee is not accepting connection requests",
    } as const;
  if (profile.relationship !== "none" || profile.accepting_requests !== true)
    return {
      kind: "unavailable",
      label:
        "Connection availability could not be confirmed. Refresh this profile.",
    } as const;
  return { kind: "request", label: "Send connection request" } as const;
}

export function profileLinkHref(
  kind: Schemas["LinkKind"],
  value: string,
): string | undefined {
  if (kind === "email")
    return /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(value)
      ? `mailto:${encodeURIComponent(value)}`
      : undefined;
  if (kind === "phone" || kind === "whatsapp") {
    if (/^\+?[\d ()-]{7,30}$/.test(value)) {
      const number = value.replace(/[^\d+]/g, "");
      return kind === "phone"
        ? `tel:${number}`
        : `https://wa.me/${number.replace(/^\+/, "")}`;
    }
    if (kind === "phone") return undefined;
  }
  try {
    const link = new URL(value);
    return link.protocol === "https:" && link.hostname ? link.href : undefined;
  } catch {
    return undefined;
  }
}
