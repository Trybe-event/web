"use client";

import { useRouter } from "next/navigation";

import { Button, ButtonLink, EmptyState } from "@/components/ui";
import {
  eventLinkScreen,
  type EventApiOutcome,
} from "@/lib/registration/link-states";

// The one shared empty-state screen for every failure path of an event link
// (web#10). web#6 (`app/[slug]/page.tsx`) renders this for whatever the
// endpoint answers; every state carries its own plain-language next action.
// Copy must never reveal whether a private or draft event exists — that rule
// lives in lib/registration/link-states.ts and is tested there.
export function EventLinkState({
  outcome,
  slug,
}: {
  outcome: EventApiOutcome;
  slug?: string | null;
}) {
  const router = useRouter();
  const state = eventLinkScreen(outcome, slug);

  return (
    <EmptyState
      title={state.title}
      action={
        state.action.kind === "refresh" ? (
          // Re-render the page: the server re-asks the API whether the event
          // link works now.
          <Button onClick={() => router.refresh()}>{state.action.label}</Button>
        ) : (
          <ButtonLink href={state.action.href}>{state.action.label}</ButtonLink>
        )
      }
    >
      {state.body}
    </EmptyState>
  );
}
