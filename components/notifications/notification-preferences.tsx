"use client";

import { useEffect, useState } from "react";

import { Alert, Button, Skeleton, Switch, useToast } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

const CATEGORY_INFO: {
  key: keyof Omit<Schemas["NotificationPreferences"], never>;
  label: string;
  description: string;
}[] = [
  {
    key: "connection_request",
    label: "Connection requests",
    description:
      "Someone asks to connect with you. Turn this off and new requests still arrive as connections; you just won't be notified about them.",
  },
  {
    key: "connection_accepted",
    label: "Accepted requests",
    description: "When someone accepts your connection request.",
  },
  {
    key: "message",
    label: "Messages",
    description:
      "New messages in a conversation. Turning this off never hides the conversation or its messages.",
  },
  {
    key: "organizer_update",
    label: "Event updates",
    description:
      "The organizer updates the schedule, venue or program of your event.",
  },
];

// Preferences only change what the server sends from now on. Existing
// requests, connections and messages are untouched — the screen saves, sends,
// and the list keeps rendering what the API returns.
export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Schemas["NotificationPreferences"] | null>(
    null,
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.GET("/me/notification-preferences").then(({ data, error }) => {
      if (data) setPrefs(data);
      else setFailure(errorMessage(error, "Preferences couldn't be loaded."));
    });
  }, []);

  async function save(next: Schemas["NotificationPreferences"]) {
    setPrefs(next); // optimistic
    setSaving(true);
    const { data, error } = await api.PUT("/me/notification-preferences", {
      body: next,
    });
    setSaving(false);
    if (error) {
      setFailure(errorMessage(error, "Your choice wasn't saved. Try again."));
      return;
    }
    setFailure(null);
    setPrefs(data ?? next);
    toast("Preferences saved.");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8">
      <h1 className="text-2xl font-bold">Notification preferences</h1>
      <p className="mt-1 text-sm text-muted">
        These switches change what you get notified about going forward. Turning
        a category off never deletes its requests or messages.
      </p>
      {failure && (
        <div className="mt-4">
          <Alert>{failure}</Alert>
        </div>
      )}
      {!prefs && !failure && (
        <div className="mt-6 flex flex-col gap-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}
      {prefs && (
        <>
          <div className="mt-6 flex flex-col gap-5">
            {CATEGORY_INFO.map(({ key, label, description }) => (
              <Switch
                key={key}
                label={label}
                description={description}
                checked={prefs[key]}
                onChange={(checked) => void save({ ...prefs, [key]: checked })}
              />
            ))}
          </div>
          <Button
            className="mt-8 self-start"
            loading={saving}
            onClick={() => void save(prefs)}
          >
            Save
          </Button>
        </>
      )}
    </div>
  );
}
