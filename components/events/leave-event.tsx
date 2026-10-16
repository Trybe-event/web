"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function leave() {
    setLeaving(true);
    setFailure("");
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
      errorMessage(error, "We couldn't remove you from this event. Try again."),
    );
    setLeaving(false);
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
