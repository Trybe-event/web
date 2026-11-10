"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog } from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";

export function DeleteDraft({
  eventId,
  name,
  returnToEvents = false,
}: {
  eventId: string;
  name: string;
  returnToEvents?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [refreshing, startRefresh] = useTransition();
  const requestPending = useRef(false);
  async function removeDraft() {
    if (requestPending.current) return;
    requestPending.current = true;
    setPending(true);
    setFailure(undefined);
    try {
      const { response, error } = await api.DELETE("/events/{eventId}", {
        params: { path: { eventId } },
        signal: AbortSignal.timeout(15000),
      });
      // A lost response can be retried safely: an already removed draft is 404.
      if (!response.ok && response.status !== 404)
        throw new Error(errorMessage(error));
      setOpen(false);
      startRefresh(() => {
        if (returnToEvents) router.replace("/organizer");
        router.refresh();
      });
    } catch (caught) {
      setFailure(
        caught instanceof Error
          ? caught.message
          : "The draft could not be deleted. Try again.",
      );
    } finally {
      requestPending.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || refreshing}
        onClick={() => {
          setFailure(undefined);
          setOpen(true);
        }}
      >
        Delete draft
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${name || "Untitled event"}?`}
        description="This permanently deletes the draft, including its event details, program days, sessions and speakers. This cannot be undone."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Keep draft
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void removeDraft()}
            >
              Delete draft permanently
            </Button>
          </>
        }
      >
        {failure && <Alert>{failure}</Alert>}
      </Dialog>
      {failure && !open && <Alert>{failure}</Alert>}
    </>
  );
}
