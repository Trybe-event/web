"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert, Button, Dialog } from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";

// LeaveEvent is the explicit way out of an event (web#9). It confirms first, because
// leaving ends the attendee's access to the workspace, directory and connections for
// that event, and the confirmation is a real dialog rather than a browser alert.
export function LeaveEvent({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [isConfirming, setConfirming] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const [failure, setFailure] = useState("");
  const pending = useRef(false);

  async function leave() {
    if (pending.current) return;
    pending.current = true;
    setLeaving(true);
    setFailure("");
    try {
      const { error, response } = await api.POST("/e/{slug}/leave", {
        params: { path: { slug } },
      });
      if (response.ok) {
        setConfirming(false);
        router.push("/attendee");
        router.refresh();
        return;
      }
      setFailure(
        errorMessage(
          error,
          "We couldn't remove you from this event. Try again.",
        ),
      );
    } catch {
      setFailure("We couldn't remove you from this event. Try again.");
    } finally {
      pending.current = false;
      setLeaving(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Leave event
      </Button>
      <Dialog
        open={isConfirming}
        onClose={() => setConfirming(false)}
        title={`Leave ${name}?`}
        description="You'll stop seeing this event and the people in it. You can join again from the event page."
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Stay
            </Button>
            <Button variant="danger" loading={isLeaving} onClick={leave}>
              Leave {name}
            </Button>
          </>
        }
      >
        {failure && <Alert>{failure}</Alert>}
      </Dialog>
    </>
  );
}
