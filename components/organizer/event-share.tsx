"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

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

// Printed brand colours, fixed so the exported graphic looks the same
// regardless of the viewer's light or dark theme.
const BRAND = {
  paper: "#faf9f5",
  ink: "#20261d",
  muted: "#5f6558",
  lime: "#c3ef66",
};

const previewSize = 256;
// Print canvas: ~10cm at 300 dpi, so the QR stays scannable in print and on phone share.
const printWidth = 1240;
const printHeight = 1600;
const qrScale = 5; // print canvas pixels per QR module

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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join(" ") !== text) {
    const last = lines[lines.length - 1];
    if (last) lines[lines.length - 1] = `${last.slice(0, -1).trim()}…`;
  }
  return lines;
}

function drawGraphic(
  canvas: HTMLCanvasElement,
  qr: HTMLCanvasElement,
  event: ShareEvent,
  url: string,
) {
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, printWidth, printHeight);

  // Lime accent bar, echoing the brand header.
  ctx.fillStyle = BRAND.lime;
  ctx.fillRect(0, 0, printWidth, 24);

  ctx.fillStyle = BRAND.ink;
  ctx.textBaseline = "top";
  ctx.font =
    "700 64px Manrope, ui-sans-serif, system-ui, 'DM Sans', sans-serif";
  const nameLines = wrapLines(ctx, event.name, printWidth - 160, 3);
  let y = 96;
  for (const line of nameLines) {
    ctx.fillText(line, 80, y);
    y += 76;
  }

  ctx.fillStyle = BRAND.muted;
  ctx.font = "500 40px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Scan the code to register", 80, y + 40);

  const qrSize = qr.width * qrScale;
  const qrTop = 500;
  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(
    (printWidth - qrSize) / 2 - 40,
    qrTop - 40,
    qrSize + 80,
    qrSize + 80,
  );
  ctx.drawImage(qr, (printWidth - qrSize) / 2, qrTop, qrSize, qrSize);

  ctx.fillStyle = BRAND.ink;
  ctx.font = "600 44px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Or open this link:", 80, qrTop + qrSize + 48);
  ctx.fillRect(80, qrTop + qrSize + 108, printWidth - 160, 2);
  ctx.font = "500 40px 'DM Sans', ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = BRAND.muted;
  ctx.fillText(
    url.length > 46 ? `${url.slice(0, 45)}…` : url,
    80,
    qrTop + qrSize + 148,
  );
}

function Panel({ event }: { event: ShareEvent }) {
  const url = event.registration_url;
  const published = Boolean(event.slug && url);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<HTMLCanvasElement | null>(null);
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

  async function withGraphic(
    then: (qr: HTMLCanvasElement, worker: HTMLCanvasElement) => void,
  ) {
    const preview = canvasRef.current;
    if (!preview) {
      setDrawError("The QR code could not be generated.");
      return;
    }
    if (!workerRef.current)
      workerRef.current = document.createElement("canvas");
    const worker = workerRef.current;
    try {
      await QRCode.toCanvas(worker, url ?? "", {
        margin: 3,
        scale: qrScale,
        errorCorrectionLevel: "M",
        color: { dark: BRAND.ink, light: BRAND.paper },
      });
      drawGraphic(worker, worker, event, url ?? "");
      setDrawError(null);
      then(preview, worker);
    } catch {
      setDrawError("The QR code could not be generated.");
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

  async function downloadPng() {
    await withGraphic((preview, worker) => {
      void preview;
      worker.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, filenameFor(event, "png"));
          toast("QR graphic downloaded.");
        }
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
