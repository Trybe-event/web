"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";
import { routes } from "@/lib/routes";

// JoinEvent is the explicit join step (web#7): the attendee presses the button, the
// API records the membership, and the workspace opens. Joining is idempotent, so a
// second press is harmless.
export function JoinEvent({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState("");

  async function join() {
    setJoining(true);
    setFailure("");
    const { error, response } = await api.POST("/e/{slug}/join", {
      params: { path: { slug } },
    });
    if (!error) {
      router.push(routes.eventWorkspace(slug));
      router.refresh();
      return;
    }
    setFailure(
      response.status === 409
        ? errorMessage(error, "You can't join this event right now.")
        : errorMessage(error, "We couldn't join you to this event. Try again."),
    );
    setJoining(false);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button loading={joining} onClick={join} aria-label={`Join ${name}`}>
        Join {name}
      </Button>
      {failure && <Alert>{failure}</Alert>}
    </div>
  );
}
