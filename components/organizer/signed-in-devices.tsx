"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Alert, Button } from "@/components/ui";

type Device = {
  id: string;
  label: string;
  lastActiveAt: Date;
  current: boolean;
  revoke: () => Promise<unknown>;
};

// Lists the organizer's active Clerk sessions and signs out every other one. Clerk owns
// sessions, so nothing here touches the Trybe API.
export function SignedInDevices() {
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const [devices, setDevices] = useState<Device[] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    user
      .getSessions()
      .then((sessions) => {
        if (cancelled) return;
        setDevices(
          sessions
            .filter((s) => s.status === "active")
            .map((s) => ({
              id: s.id,
              label:
                [s.latestActivity.browserName, s.latestActivity.deviceType]
                  .filter(Boolean)
                  .join(" on ") || "Browser",
              lastActiveAt: s.lastActiveAt,
              current: s.id === session?.id,
              revoke: () => s.revoke(),
            })),
        );
      })
      .catch(() => !cancelled && setError("We couldn't load your devices."));
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, session?.id]);

  async function signOutOthers() {
    if (!devices) return;
    setBusy(true);
    setError(undefined);
    const others = devices.filter((d) => !d.current);
    const results = await Promise.allSettled(others.map((d) => d.revoke()));
    const failed = new Set(
      others
        .filter((_, i) => results[i]?.status === "rejected")
        .map((d) => d.id),
    );
    setDevices(devices.filter((d) => d.current || failed.has(d.id)));
    if (failed.size > 0)
      setError("Some devices could not be signed out. Try again.");
    setBusy(false);
  }

  if (error && !devices) return <Alert tone="danger">{error}</Alert>;
  if (!devices) return <p className="text-sm text-muted">Loading devices…</p>;
  const others = devices.filter((d) => !d.current).length;
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>
              {d.label}
              <span className="block text-xs text-muted">
                Last active {d.lastActiveAt.toLocaleString()}
              </span>
            </span>
            {d.current && <strong className="text-xs">This device</strong>}
          </li>
        ))}
      </ul>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button
        type="button"
        variant="secondary"
        disabled={others === 0}
        loading={busy}
        onClick={() => void signOutOthers()}
      >
        Sign out other devices
      </Button>
    </div>
  );
}
