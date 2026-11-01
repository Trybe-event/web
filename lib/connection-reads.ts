import { api, errorMessage, type Schemas } from "./api/client";

async function readConnectionList<Item>(
  request: () => Promise<{
    response: Response;
    data?: { items: Item[] };
    error?: unknown;
  }>,
  fallback: string,
): Promise<{ items: Item[]; error: null } | { items: null; error: string }> {
  try {
    const result = await request();
    if (result.response.ok && result.data)
      return { items: result.data.items, error: null };
    return { items: null, error: errorMessage(result.error, fallback) };
  } catch {
    return { items: null, error: fallback };
  }
}

export function fetchPendingRequests(direction: "incoming" | "outgoing") {
  return readConnectionList<Schemas["ConnectionRequest"]>(
    () =>
      api.GET("/me/connection-requests", { params: { query: { direction } } }),
    "We couldn't load your connection requests. Try again.",
  );
}

export function fetchAcceptedConnections() {
  return readConnectionList<Schemas["Connection"]>(
    () => api.GET("/me/connections"),
    "We couldn't load your accepted connections. Try again.",
  );
}
