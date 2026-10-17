import { Badge } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import { lifecycleStatuses } from "@/lib/event-lifecycle";
export function EventStatusBadges({
  event,
}: {
  event: Pick<
    Schemas["Event"],
    "status" | "registration_state" | "networking_state"
  >;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Event lifecycle status">
      {lifecycleStatuses(event).map(({ label, value }) => (
        <Badge key={label}>
          {label}: {value}
        </Badge>
      ))}
    </div>
  );
}
