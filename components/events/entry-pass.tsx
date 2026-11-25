"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

import { Alert, Button, Card, Skeleton } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

type Pass = Schemas["EntryPass"];

// The QR holds only the random pass code: no name, email or event details.
export function EntryPass({ eventId }: { eventId: string }) {
  const [pass, setPass] = useState<Pass | null>(null);
  const [image, setImage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  const show = useCallback(async (next: Pass) => {
    setPass(next);
    setImage(await QRCode.toDataURL(next.code, { margin: 2, width: 320 }));
  }, []);

  useEffect(() => {
    void (async () => {
      const { data, error } = await api.GET("/events/{eventId}/pass", {
        params: { path: { eventId } },
      });
      if (data) await show(data);
      else setFailure(errorMessage(error));
    })();
  }, [eventId, show]);

  async function reissue() {
    if (!window.confirm("Get a new pass? The current QR code stops working."))
      return;
    setBusy(true);
    setFailure("");
    const { data, error } = await api.POST("/events/{eventId}/pass/reissue", {
      params: { path: { eventId } },
    });
    if (data) await show(data);
    else setFailure(errorMessage(error));
    setBusy(false);
  }

  if (failure && !pass) return <Alert>{failure}</Alert>;
  if (!pass || !image) return <Skeleton className="h-80 w-80" />;
  return (
    <Card className="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, nothing to optimise */}
      <img src={image} alt="Your entry pass QR code" width={320} height={320} />
      <p className="text-sm text-muted">
        Show this at the entrance. Keep it to yourself: anyone with this code
        can be checked in as you.
      </p>
      {pass.checked_in_days.length > 0 && (
        <p className="text-sm font-semibold">
          Checked in: {pass.checked_in_days.join(", ")}
        </p>
      )}
      {failure && <Alert>{failure}</Alert>}
      <Button variant="secondary" size="sm" disabled={busy} onClick={reissue}>
        Shared it by mistake? Get a new pass
      </Button>
    </Card>
  );
}
