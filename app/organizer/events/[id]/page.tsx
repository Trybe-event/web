import type { Metadata } from "next";
import { EventOverview } from "@/components/organizer/event-overview";
import { loadOwnedEvent, loadOwnedProgram } from "@/lib/organizer-event";
import {
  loadOrganizerEvents,
  loadRegistrationTrend,
} from "@/lib/organizer-dashboard";
export const metadata: Metadata = { title: "Event overview" };
export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  const [events, program, trend] = await Promise.all([
    loadOrganizerEvents(),
    loadOwnedProgram(id),
    loadRegistrationTrend(id),
  ]);
  return (
    <EventOverview
      event={owned.event}
      summary={events?.find((event) => event.id === id) || null}
      program={program}
      trend={trend}
    />
  );
}
