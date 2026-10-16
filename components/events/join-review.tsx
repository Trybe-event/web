import Link from "next/link";

import { PreviewCard } from "@/app/attendee/profile/preview/profile-preview";
import { Badge } from "@/components/ui";
import type { JoinPreview } from "@/lib/events";
import { withEventParam } from "@/lib/routes";

import { JoinEvent } from "./join-event";

// JoinReview is what a returning attendee sees before they join (web#8): their saved
// profile exactly as event members will receive it, and an explicit confirm. Nothing
// registers until that confirm is pressed — opening an event link only reads.
//
// PreviewCard lives with the profile preview screen so both surfaces render identical
// filtering, and this stays a server component: only the confirm button is interactive.
export function JoinReview({
  slug,
  name,
  preview,
}: {
  slug: string;
  name: string;
  preview: JoinPreview;
}) {
  return (
    <section className="join-review" aria-labelledby="join-review-title">
      <h2 id="join-review-title" className="text-lg font-bold">
        This is what people at {name} will see
      </h2>
      <p className="mt-2 text-sm text-muted">
        Your profile is shared with everyone at {name}. If you change it later,
        the change applies everywhere you use Trybe.
      </p>
      <div className="mt-4">
        <PreviewCard profile={preview.asEventMember} />
      </div>
      <p className="mt-3 text-sm text-muted">
        <Badge>Private</Badge> Contact details you set to &ldquo;Only me&rdquo;
        are not shown here and never leave your account.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <JoinEvent slug={slug} name={name} label="Confirm and join" />
        <Link
          className="text-sm font-semibold"
          href={withEventParam("/attendee/profile/edit", slug)}
        >
          Edit your profile
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        Nothing has been shared yet. You join {name} only when you confirm.
      </p>
    </section>
  );
}
