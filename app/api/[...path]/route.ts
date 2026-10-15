// Same-origin proxy from the browser to the Go API. Only contract operations pass; the
// caller's Clerk session and the proxy secret are attached here on the server.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { apiBaseUrl, PROXY_SECRET_HEADER } from "@/lib/api/server";
import {
  clientIp,
  forwardHeaders,
  isAllowed,
  isSameOrigin,
  MAX_BODY_BYTES,
  responseHeaders,
  STREAM_PATHS,
  TIMEOUT_MS,
  WEBHOOK_PATHS,
} from "@/lib/proxy";

export const dynamic = "force-dynamic";

const error = (status: number, code: string, message: string) =>
  NextResponse.json(
    { code, message },
    { status, headers: { "cache-control": "no-store" } },
  );

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  const path = "/" + segments.map(encodeURIComponent).join("/");
  const method = req.method.toUpperCase();

  if (!isAllowed(method, path)) return error(404, "not_found", "Not found.");

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  if (
    !WEBHOOK_PATHS.has(path) &&
    !isSameOrigin(method, req.headers.get("origin"), new URL(appOrigin).origin)
  ) {
    return error(403, "forbidden", "Cross-site request refused.");
  }

  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return error(413, "too_large", "Request body is too large.");
    }
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES)
      return error(413, "too_large", "Request body is too large.");
  }

  const headers = forwardHeaders(req.headers, path);
  if (!WEBHOOK_PATHS.has(path)) {
    const token = await (await auth()).getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  if (process.env.PROXY_SHARED_SECRET)
    headers.set(PROXY_SECRET_HEADER, process.env.PROXY_SHARED_SECRET);
  const ip = clientIp(req.headers);
  if (ip) headers.set("x-real-ip", ip);

  const streaming = STREAM_PATHS.has(path);
  let upstream: Response;
  try {
    upstream = await fetch(apiBaseUrl() + path + req.nextUrl.search, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: streaming
        ? req.signal
        : AbortSignal.any([req.signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
  } catch {
    return error(
      502,
      "unavailable",
      "Trybe is having trouble right now. Try again shortly.",
    );
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
