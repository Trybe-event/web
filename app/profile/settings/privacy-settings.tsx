"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  ButtonLink,
  Card,
  Skeleton,
  Switch,
  useToast,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

export function PrivacySettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<Schemas["PrivacySettings"] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    api
      .GET("/me/privacy")
      .then(({ data, error }) =>
        data ? setSettings(data) : setFailure(errorMessage(error)),
      );
  }, []);

  async function update(next: Schemas["PrivacySettings"]) {
    const previous = settings;
    setSettings(next);
    setSaving(true);
    setFailure(null);
    const { data, error } = await api.PUT("/me/privacy", { body: next });
    setSaving(false);
    if (data) {
      setSettings(data);
      toast("Settings saved");
    } else {
      setSettings(previous);
      setFailure(errorMessage(error));
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Privacy settings</h1>
      {failure && <Alert>{failure}</Alert>}
      {!settings && !failure && <Skeleton className="h-40" />}
      {settings && (
        <Card className="flex flex-col gap-6">
          <Switch
            label="Accept new connection requests"
            description="When off, people can still see your profile at shared events but can't send you new requests."
            checked={settings.accepting_requests}
            disabled={saving}
            onChange={(v) => update({ ...settings, accepting_requests: v })}
          />
          <Switch
            label="Leave me out of AI matching"
            description="AI matching is coming later. Turn this on now and you'll never be suggested by it."
            checked={settings.ai_matching_opt_out}
            disabled={saving}
            onChange={(v) => update({ ...settings, ai_matching_opt_out: v })}
          />
        </Card>
      )}
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Who sees your contact details</h2>
        <p className="text-muted">
          Each link and contact detail has its own setting on your profile.
          Contact details start as visible only to you. Changing a setting
          applies straight away, including to existing connections. Anything
          someone has already seen or copied can&apos;t be recalled.
        </p>
        <ButtonLink
          href="/profile/edit"
          variant="secondary"
          className="mt-2 self-start"
        >
          Choose what each link shows
        </ButtonLink>
      </Card>
    </main>
  );
}
