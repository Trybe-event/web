import "server-only";

import type { components, operations } from "./api/schema";
import { serverApi } from "./api/server";

export type OrganizerEvent = components["schemas"]["OrganizerEventSummary"];
export type RegistrationPoint =
  operations["getRegistrationTrend"]["responses"][200]["content"]["application/json"]["points"][number];

export async function loadOrganizerEvents(): Promise<OrganizerEvent[] | null> {
  try {
    const client = await serverApi();
    const { data, response } = await client.GET("/organizer/events", {
      signal: AbortSignal.timeout(8000),
    });
    return response.ok && data ? data.items : null;
  } catch {
    return null;
  }
}

export async function loadRegistrationTrend(
  eventId: string,
): Promise<RegistrationPoint[] | null> {
  try {
    const client = await serverApi();
    const { data, response } = await client.GET(
      "/organizer/events/{eventId}/registrations/trend",
      {
        params: { path: { eventId } },
        signal: AbortSignal.timeout(8000),
      },
    );
    return response.ok && data ? data.points : null;
  } catch {
    return null;
  }
}

export type EventAnalytics = components["schemas"]["EventAnalytics"];

export async function loadEventAnalytics(
  eventId: string,
): Promise<EventAnalytics | null> {
  try {
    const client = await serverApi();
    const { data, response } = await client.GET(
      "/organizer/events/{eventId}/analytics",
      {
        params: { path: { eventId } },
        signal: AbortSignal.timeout(10000),
      },
    );
    return response.ok && data ? data : null;
  } catch {
    return null;
  }
}
