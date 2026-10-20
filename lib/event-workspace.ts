import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { serverApi } from "./api/server";
import { requireAccount } from "./session";
import { isEventSlug } from "./routes";
import type { Schemas } from "./api/client";

export const requireEventWorkspace = cache(async (slug: string) => {
  if (!isEventSlug(slug)) notFound();
  const access = await requireAccount("attendee");
  if ("unavailable" in access) return { kind: "unavailable" } as const;
  let memberships: Schemas["MyEvent"][];
  try {
    const client = await serverApi();
    const result = await client.GET("/me/events", {
      signal: AbortSignal.timeout(8000),
    });
    if (!result.response.ok || !result.data)
      return { kind: "unavailable" } as const;
    memberships = result.data.items.filter(
      (item) => item.membership.status === "active",
    );
  } catch {
    return { kind: "unavailable" } as const;
  }
  const membership = memberships.find((item) => item.event.slug === slug);
  if (!membership) notFound();
  return {
    kind: "member",
    account: access.account,
    event: membership.event,
    events: memberships.map((item) => ({
      slug: item.event.slug,
      name: item.event.name,
    })),
  } as const;
});
