// Browser-side API client. It only ever calls this app's same-origin /api proxy;
// the proxy attaches the session and forwards to the Go API.
import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export const api = createClient<paths>({ baseUrl: "/api" });

export type Schemas = components["schemas"];
export type ApiError = Schemas["Error"];

// fieldErrors turns an API validation error into react-hook-form friendly messages.
export function fieldErrors(error: unknown): Record<string, string> {
  if (
    error &&
    typeof error === "object" &&
    "fields" in error &&
    error.fields &&
    typeof error.fields === "object"
  ) {
    return error.fields as Record<string, string>;
  }
  return {};
}

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
