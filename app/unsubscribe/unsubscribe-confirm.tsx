"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";

// What each group switches off, and where the person can turn it back on.
export const unsubscribeGroups: Record<
  string,
  { what: string; settings: string }
> = {
  event_updates: {
    what: "emails when your events start, are about to end, and are ready to be ended",
    settings: "/organizer/settings",
  },
  event_summaries: {
    what: "the report email after each of your events ends",
    settings: "/organizer/settings",
  },
  event_recaps: {
    what: "the networking recap email after events you attend",
    settings: "/attendee/notifications/preferences",
  },
};

export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<
    | { kind: "idle" | "working" }
    | { kind: "done"; group: string }
    | { kind: "failed"; message: string }
  >({ kind: "idle" });

  async function confirm() {
    setState({ kind: "working" });
    try {
      const { data, error } = await api.POST("/email/unsubscribe", {
        params: { query: { token } },
      });
      if (data) setState({ kind: "done", group: data.group });
      else setState({ kind: "failed", message: errorMessage(error) });
    } catch {
      setState({
        kind: "failed",
        message:
          "We couldn't reach Trybe. Check your connection and try again.",
      });
    }
  }

  if (state.kind === "done") {
    const group = unsubscribeGroups[state.group];
    return (
      <div className="space-y-3" role="status">
        <p>
          You&apos;re unsubscribed. Trybe will no longer send you{" "}
          {group?.what ?? "these emails"}.
        </p>
        <p className="text-sm text-muted">
          Emails about your account and registrations still arrive.{" "}
          {group && (
            <>
              You can turn this back on any time in your{" "}
              <Link className="underline" href={group.settings}>
                email settings
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-muted">
        Confirm to stop this kind of email. Emails about your account and
        registrations will still arrive.
      </p>
      <Button loading={state.kind === "working"} onClick={() => void confirm()}>
        Unsubscribe
      </Button>
      {state.kind === "failed" && <Alert tone="danger">{state.message}</Alert>}
    </div>
  );
}
