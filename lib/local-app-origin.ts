const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Keep development cookies and Clerk's authorized party on one configured origin.
export function localAppRedirect(
  requestUrl: string,
  method: string,
  appUrl: string | undefined,
  environment: string | undefined,
): string | null {
  if (
    environment !== "development" ||
    !appUrl ||
    !["GET", "HEAD"].includes(method)
  ) {
    return null;
  }
  try {
    const request = new URL(requestUrl);
    const configured = new URL(appUrl);
    if (
      !loopbackHosts.has(request.hostname) ||
      !loopbackHosts.has(configured.hostname) ||
      request.protocol !== configured.protocol ||
      request.port !== configured.port ||
      request.origin === configured.origin ||
      /^\/(api|trpc|_next)(\/|$)/.test(request.pathname)
    ) {
      return null;
    }
    configured.pathname = request.pathname;
    configured.search = request.search;
    configured.hash = "";
    return configured.toString();
  } catch {
    return null;
  }
}
