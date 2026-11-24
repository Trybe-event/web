"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { SignOut } from "@/components/auth/sign-out";
import { api } from "@/lib/api/client";

export function AttendeeAccountIdentity({
  accountName,
}: {
  accountName?: string;
}) {
  const pathname = usePathname();
  const [profileIdentity, setProfileIdentity] = useState<{
    fullName: string;
    photoUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Profile saving navigates back to preview/home. Read again to show the saved
    // photo even when the surrounding workspace layout stays mounted.
    api
      .GET("/me/profile", {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(8_000),
        ]),
      })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setProfileIdentity(
            data
              ? { fullName: data.full_name, photoUrl: data.photo_url ?? null }
              : null,
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileIdentity(null);
      });
    return () => controller.abort();
  }, [pathname]);

  const fullName = (profileIdentity?.fullName || accountName || "").trim();
  const firstName = fullName.trim().split(/\s+/)[0] || "Your Trybe";

  return (
    <div className="attendee-identity">
      <Link href="/attendee/profile" aria-label="Your profile">
        <span className="attendee-identity-avatar" aria-hidden="true">
          <Avatar name={firstName} src={profileIdentity?.photoUrl} size={30} />
        </span>
        <span className="attendee-identity-name">
          <strong title={fullName}>{firstName}</strong>
          <small>Attendee workspace</small>
        </span>
      </Link>
      <SignOut iconOnly />
    </div>
  );
}
