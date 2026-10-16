import "server-only";
import { serverApi } from "./api/server";
export async function loadEventArchive(eventId: string) {
  try {
    const client = await serverApi();
    const result = await client.GET("/events/{eventId}/archive", {
      params: { path: { eventId } },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return result.response.ok && result.data ? result.data : null;
  } catch {
    return null;
  }
}
