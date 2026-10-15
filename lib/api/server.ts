// Server-side API client for server components and route handlers. It calls the Go API
// directly with the caller's Clerk session and the proxy secret. Never import it from
// client components: `server-only` makes that a build error.
import "server-only";

import { auth } from "@clerk/nextjs/server";
import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const PROXY_SECRET_HEADER = "X-Trybe-Proxy-Secret";

export function apiBaseUrl(): string {
  const url = process.env.API_INTERNAL_URL;
  if (!url) throw new Error("API_INTERNAL_URL is not set");
  return url.replace(/\/$/, "");
}

export async function serverApi() {
  const { getToken } = await auth();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (process.env.PROXY_SHARED_SECRET)
    headers[PROXY_SECRET_HEADER] = process.env.PROXY_SHARED_SECRET;
  return createClient<paths>({
    baseUrl: apiBaseUrl(),
    headers,
    cache: "no-store",
  });
}
