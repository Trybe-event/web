"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  drawEventShareGraphic,
  SHARE_COLORS as BRAND,
} from "@/lib/event-share-graphic";

import {
  Alert,
  Button,
  EmptyState,
  ToastProvider,
  useToast,
} from "@/components/ui";

type ShareEvent = {
  name: string;
  slug: string | null;
  registration_url: string | null;
};

const previewSize = 256;

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function filenameFor(event: ShareEvent, ext: string) {
  const base =
    (event.slug ?? event.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";
  return `${base}-registration-qr.${ext}`;
}

function Panel({ event }: { event: ShareEvent }) {
  const url = event.registration_url;
  const published = Boolean(event.slug && url);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const toast = useToast();

  // The QR is drawn ONLY from the registration URL. Editing the event's other
  // details re-renders this component but must never change the code (web#5).
  useEffect(() => {
    if (!published || url === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let settled = false;
    QRCode.toCanvas(canvas, url, {
      margin: 3,
      width: previewSize,
      errorCorrectionLevel: "M",
      color: { dark: BRAND.ink, light: BRAND.paper },
    })
      .then(() => {
        settled = true;
        setDrawError(null);
      })
      .catch(() => {
        if (!settled) setDrawError("The QR code could not be generated.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  function withGraphic(then: (worker: HTMLCanvasElement) => void) {
    if (!url) return;
    try {
      const worker = document.createElement("canvas");
      drawEventShareGraphic(worker, event.name, url);
      setDrawError(null);
      then(worker);
    } catch {
      setDrawError("The QR graphic could not be generated. Try again.");
    }
  }
  async function copyLink() {
    if (!url) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast("Registration link copied.");
    } catch {
      toast("Copying is blocked in this browser. Select the link to copy it.");
    } finally {
      setCopying(false);
    }
  }

  function downloadPng() {
    withGraphic((worker) => {
      worker.toBlob((blob) => {
        if (!blob) {
          setDrawError("The image could not be exported. Try again.");
          return;
        }
        downloadBlob(blob, filenameFor(event, "png"));
        toast("QR graphic downloaded.");
      }, "image/png");
    });
  }

  async function downloadSvg() {
    try {
      const svg = await QRCode.toString(url ?? "", {
        type: "svg",
        margin: 3,
        errorCorrectionLevel: "M",
        color: { dark: BRAND.ink, light: BRAND.paper },
      });
      downloadBlob(
        new Blob([svg], { type: "image/svg+xml" }),
        filenameFor(event, "svg"),
      );
      toast("QR file downloaded.");
    } catch {
      setDrawError("The QR code could not be generated.");
    }
  }

  if (!published)
    return (
      <EmptyState title="Publish your event to get a share link">
        Publishing picks its permanent link and QR code. Draft events don&apos;t
        have one yet, and the link never changes after that.
      </EmptyState>
    );

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="w-full max-w-80 rounded-xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold">Registration link</p>
        <p className="mt-2 break-all text-sm text-muted">{url}</p>
        <canvas
          ref={canvasRef}
          width={previewSize}
          height={previewSize}
          aria-label={`QR code that opens the registration page for ${event.name}`}
          className="mt-4 h-auto w-full rounded-lg border border-line"
        />
        {drawError && <Alert tone="danger">{drawError}</Alert>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={copyLink} loading={copying}>
          Copy link
        </Button>
        <Button variant="secondary" onClick={downloadPng}>
          Download graphic (PNG)
        </Button>
        <Button variant="ghost" onClick={downloadSvg}>
          Download QR (SVG)
        </Button>
      </div>
      <p className="text-sm text-muted">
        The link and QR are permanent. Editing the event never changes them.
      </p>
    </div>
  );
}

export function EventSharePanel({ event }: { event: ShareEvent }) {
  return (
    <ToastProvider>
      <Panel event={event} />
    </ToastProvider>
  );
}
