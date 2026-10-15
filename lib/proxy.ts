// Rules for the same-origin /api proxy (PRD §38, §39). Kept free of Next.js imports so
// they can be unit tested.
import { CONTRACT_ROUTES } from "./api/routes.gen";

export const MAX_BODY_BYTES = 1 << 20; // 1 MB, matching the API
export const TIMEOUT_MS = 15_000;

// Paths answered as streams: no timeout and no buffering.
export const STREAM_PATHS = new Set(["/notifications/stream"]);

// Signature-verified callbacks from Clerk; they carry no session and no Origin header.
export const WEBHOOK_PATHS = new Set(["/webhooks/clerk"]);

const compiled = CONTRACT_ROUTES.map(([method, pattern]) => ({
  method,
  regex: new RegExp("^" + pattern.replace(/\{[^}]+\}/g, "[^/]+") + "$"),
}));

// isAllowed reports whether method+path is an operation in the API contract.
export function isAllowed(method: string, path: string): boolean {
  if (path.includes("..") || path.includes("//")) return false;
  return compiled.some((r) => r.method === method && r.regex.test(path));
}

// Request headers the browser may pass through. Everything else, including any
// identity, authorization or forwarding header the caller sets, is dropped.
const FORWARDED = [
  "accept",
  "content-type",
  "idempotency-key",
  "last-event-id",
  "x-request-id",
];
const WEBHOOK_FORWARDED = ["svix-id", "svix-timestamp", "svix-signature"];

export function forwardHeaders(incoming: Headers, path: string): Headers {
  const out = new Headers();
  const allowed = WEBHOOK_PATHS.has(path)
    ? [...FORWARDED, ...WEBHOOK_FORWARDED]
    : FORWARDED;
  for (const name of allowed) {
    const v = incoming.get(name);
    if (v !== null) out.set(name, v);
  }
  return out;
}

// Response headers passed back to the browser.
const RETURNED = [
  "content-type",
  "retry-after",
  "x-request-id",
  "cache-control",
];

export function responseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const name of RETURNED) {
    const v = upstream.get(name);
    if (v !== null) out.set(name, v);
  }
  if (!out.has("cache-control")) out.set("cache-control", "no-store");
  return out;
}

// isSameOrigin protects cookie-authenticated mutations from cross-site requests (CSRF).
export function isSameOrigin(
  method: string,
  origin: string | null,
  appOrigin: string,
): boolean {
  if (method === "GET" || method === "HEAD") return true;
  return origin !== null && origin === appOrigin;
}

// clientIp takes the first address the hosting platform recorded.
export function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || undefined;
}
