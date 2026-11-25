"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert, Button, Card, Dialog } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { localEventTime } from "@/lib/event-time";
import { autoEndTime, awaitingEnd } from "@/lib/event-lifecycle";

// Shown on the event overview once the scheduled end has passed and the event is still
// published, so ending it does not depend on finding Event settings.
export function EndEventPrompt({ event }: { event: Schemas["Event"] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const lock = useRef(false);
  if (!awaitingEnd(event) || !event.ends_at) return null;
  const timezone = event.timezone || "UTC";
  const at = (value: string) =>
    localEventTime(value, timezone).replace("T", " ");

  async function end() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setFailure("");
    try {
      const { data, error } = await api.POST("/events/{eventId}/status", {
        params: { path: { eventId: event.id } },
        body: { status: "ended" },
        signal: AbortSignal.timeout(15000),
      });
      if (!data) throw new Error(errorMessage(error));
      setConfirm(false);
      router.refresh();
    } catch (caught) {
      setFailure(
        caught instanceof Error ? caught.message : "Could not end the event.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Your event has finished</h2>
      <p className="text-sm text-muted">
        It was scheduled to end at {at(event.ends_at)} ({timezone}). End it now
        to close it and send your report, or Trybe will end it for you at{" "}
        {at(autoEndTime(event.ends_at).toISOString())}.
      </p>
      {failure && <Alert>{failure}</Alert>}
      <Button variant="danger" onClick={() => setConfirm(true)}>
        End event
      </Button>
      <Dialog
        open={confirm}
        onClose={() => {
          if (!pending) setConfirm(false);
        }}
        title="End this event?"
        description="This marks the event as ended. Networking follows its separate window, and accepted connections are retained."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirm(false)}
            >
              Keep event open
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void end()}
            >
              Confirm end event
            </Button>
          </>
        }
      />
    </Card>
  );
}
