import "server-only";
import { serverApi } from "./api/server";
import type { Schemas } from "./api/client";

export async function loadAttendeeEventSnapshot(): Promise<{
  items: Schemas["MyEvent"][];
  readAt: number;
} | null> {
  try {
    const client = await serverApi();
    const { data, response } = await client.GET("/me/events", {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !data) return null;
    return {
      items: data.items.filter((item) =>
        ["active", "pending", "waitlisted"].includes(item.membership.status),
      ),
      readAt: new Date().getTime(),
    };
  } catch {
    return null;
  }
}
