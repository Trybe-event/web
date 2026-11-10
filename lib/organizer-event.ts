import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { serverApi } from "./api/server";
import { requireAccount } from "./session";

// Request-scoped caching shares the ownership check between layout and page.
// Never cache this across sessions: the API authorizes the current organizer.
export const loadOwnedEvent = cache(async (eventId: string) => {
  const access = await requireAccount("organizer");
  if ("unavailable" in access) return null;
  try {
    const client = await serverApi();
    const { data, response } = await client.GET("/events/{eventId}", {
      params: { path: { eventId } },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404 || response.status === 400) notFound();
    if (!response.ok || !data) return null;
    return { event: data, account: access.account };
  } catch (error) {
    // Preserve Next.js not-found/redirect control flow.
    if (error instanceof Error && "digest" in error) throw error;
    return null;
  }
});

export async function loadOwnedProgram(eventId: string) {
  try {
    const client = await serverApi();
    const { data, response } = await client.GET("/events/{eventId}/program", {
      params: { path: { eventId } },
      signal: AbortSignal.timeout(8000),
    });
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
