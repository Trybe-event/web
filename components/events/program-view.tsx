import { Badge, Card, EmptyState } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import { localEventTime } from "@/lib/event-time";

export function ProgramView({
  program,
  timezone,
}: {
  program: Schemas["Program"];
  timezone: string;
}) {
  if (!program.days.length)
    return (
      <EmptyState title="No sessions announced yet">
        Check back for the event program.
      </EmptyState>
    );
  return (
    <div className="space-y-5">
      {program.days.map((day) => (
        <section key={day.id} className="space-y-3">
          <h2 className="text-xl font-bold">
            {day.date}
            {day.title ? ` · ${day.title}` : ""}
          </h2>
          {!day.sessions.length && (
            <p className="text-sm text-muted">
              No sessions announced for this day.
            </p>
          )}
          <div className="grid gap-3 xl:grid-cols-2">
            {day.sessions.map((session) => (
              <Card key={session.id} className="min-w-0 space-y-3 break-words">
                <h3 className="text-lg font-semibold">{session.title}</h3>
                <p className="text-sm text-muted">
                  {localEventTime(session.starts_at, timezone).replace(
                    "T",
                    " ",
                  )}{" "}
                  to{" "}
                  {localEventTime(session.ends_at, timezone).replace("T", " ")}{" "}
                  ({timezone})
                </p>
                {session.overlaps_with.length > 0 && (
                  <Badge>Parallel session</Badge>
                )}
                {(session.room || session.track) && (
                  <p className="text-sm">
                    {[session.room, session.track].filter(Boolean).join(" · ")}
                  </p>
                )}
                {session.description && (
                  <p className="whitespace-pre-wrap text-sm">
                    {session.description}
                  </p>
                )}
                {session.speakers?.map((speaker, index) => (
                  <div
                    key={index}
                    className="border-t border-line pt-2 text-sm"
                  >
                    <strong>{speaker.name}</strong>
                    <p>
                      {[speaker.role, speaker.organization]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {speaker.bio && <p>{speaker.bio}</p>}
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
