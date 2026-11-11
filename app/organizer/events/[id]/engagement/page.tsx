import type { Metadata } from "next";
import { OrganizerEngagement } from "@/components/engagement";
import { loadOwnedEvent } from "@/lib/organizer-event";

export const metadata: Metadata = { title: "Updates & Q&A" };

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owned = await loadOwnedEvent(id);
  if (!owned) return null;
  return (
    <div className="space-y-5">
      <section className="organizer-section-heading">
        <h1>Updates & Q&A</h1>
        <p>
          Post announcements to admitted attendees and review the questions they
          ask.
        </p>
      </section>
      <OrganizerEngagement eventId={id} />
    </div>
  );
}
