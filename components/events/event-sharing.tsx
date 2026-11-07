"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Copy, Download, ImageIcon, Share2 } from "lucide-react";
import { Alert, Button, Dialog, Input } from "@/components/ui";
import {
  ARTWORK_FORMATS,
  ARTWORK_THEMES,
  artworkPath,
  eventShareLinks,
  type ArtworkFormat,
  type ArtworkTheme,
} from "@/lib/event-artwork";

export function EventSharing({
  slug,
  name,
  url,
}: {
  slug: string;
  name: string;
  url: string;
}) {
  const [dialog, setDialog] = useState<"share" | "artwork" | null>(null);
  const [format, setFormat] = useState<ArtworkFormat>("post");
  const [theme, setTheme] = useState<ArtworkTheme>("forest");
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [asset, setAsset] = useState<{
    path: string;
    file: File;
    preview: string;
  }>();
  const path = artworkPath(slug, dialog === "artwork" ? format : "og", theme);
  const currentAsset = asset?.path === path ? asset : undefined;
  const links = eventShareLinks(url, name);
  useEffect(() => {
    if (!dialog) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("image/png")
        )
          throw new Error("Artwork could not be prepared. Try again.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setAsset({
          path,
          preview: objectUrl,
          file: new File(
            [blob],
            `${slug}-${dialog === "artwork" ? format : "preview"}.png`,
            { type: "image/png" },
          ),
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFailure(
            error instanceof Error
              ? error.message
              : "Artwork could not be prepared.",
          );
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dialog, path, slug, format, retry]);

  function open(next: "share" | "artwork") {
    setFailure("");
    setNotice("");
    setAsset(undefined);
    setDialog(next);
  }
  async function share(includeArtwork = false) {
    setFailure("");
    if (!navigator.share) {
      open("share");
      if (includeArtwork)
        setNotice(
          "Download the image and copy the link to share from this browser.",
        );
      return;
    }
    const data: ShareData = { title: name, text: name, url };
    if (includeArtwork && currentAsset) {
      if (!navigator.canShare?.({ files: [currentAsset.file] })) {
        setNotice(
          "This browser cannot share image files. Download the PNG and attach it with the copied event link.",
        );
        return;
      }
      data.files = [currentAsset.file];
      data.text = `${name}\n${url}`;
    }
    try {
      await navigator.share(data);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setDialog("share");
      setAsset(undefined);
      setFailure(
        "Your device could not open sharing. Copy the link or choose an option below.",
      );
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Event link copied.");
      setFailure("");
    } catch {
      setFailure("Copy is unavailable. Select and copy the event link below.");
    }
  }
  function download() {
    if (!currentAsset) return;
    const anchor = document.createElement("a");
    anchor.href = currentAsset.preview;
    anchor.download = currentAsset.file.name;
    anchor.click();
  }
  const dimensions = ARTWORK_FORMATS[dialog === "artwork" ? format : "og"];
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void share()}>
          <Share2 size={16} aria-hidden="true" />
          Share
        </Button>
        <Button variant="secondary" size="sm" onClick={() => open("artwork")}>
          <ImageIcon size={16} aria-hidden="true" />
          Event artwork
        </Button>
      </div>
      <Dialog
        open={dialog !== null}
        onClose={() => {
          setDialog(null);
          setAsset(undefined);
        }}
        title={dialog === "artwork" ? "Event artwork" : "Share this event"}
        description={
          dialog === "artwork"
            ? "Choose a format and background, then download or share your event image."
            : "Invite people with the event link or share an image from your device."
        }
        size={dialog === "artwork" ? "wide" : "default"}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setDialog(null);
              setAsset(undefined);
            }}
          >
            Close
          </Button>
        }
      >
        <div
          className={
            dialog === "artwork"
              ? "grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(15rem,1fr)]"
              : "space-y-4"
          }
        >
          <div className="flex min-h-40 items-center justify-center rounded-xl bg-paper p-4">
            {currentAsset ? (
              <Image
                src={currentAsset.preview}
                width={dimensions.width}
                height={dimensions.height}
                unoptimized
                alt={`${name} share artwork`}
                className="max-h-[55dvh] w-auto max-w-full rounded-lg object-contain"
              />
            ) : (
              <p role="status" className="text-sm text-muted">
                {failure
                  ? "Preview unavailable"
                  : "Preparing your event image..."}
              </p>
            )}
          </div>
          <div className="space-y-5">
            {dialog === "artwork" && (
              <>
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold">Format</legend>
                  {(
                    Object.entries(ARTWORK_FORMATS).filter(
                      ([key]) => key !== "og",
                    ) as [
                      ArtworkFormat,
                      (typeof ARTWORK_FORMATS)[ArtworkFormat],
                    ][]
                  ).map(([key, option]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="artwork-format"
                        value={key}
                        checked={format === key}
                        onChange={() => {
                          setFailure("");
                          setFormat(key);
                        }}
                      />
                      <span>
                        {option.label}{" "}
                        <span className="text-muted">
                          {option.width} × {option.height}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold">
                    Background
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(ARTWORK_THEMES).map(([key, option]) => (
                      <button
                        type="button"
                        key={key}
                        aria-label={option.label}
                        aria-pressed={theme === key}
                        onClick={() => {
                          setFailure("");
                          setTheme(key as ArtworkTheme);
                        }}
                        className="size-12 rounded-xl border-2 border-line aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-focus"
                        style={{
                          backgroundImage: `linear-gradient(135deg,${option.from},${option.to})`,
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <label className="block space-y-2 text-sm font-semibold">
              Event link
              <Input
                value={url}
                readOnly
                onFocus={(event) => event.target.select()}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void copyLink()}>
                <Copy size={16} aria-hidden="true" />
                Copy link
              </Button>
              <Button disabled={!currentAsset} onClick={download}>
                <Download size={16} aria-hidden="true" />
                Download PNG
              </Button>
              <Button
                variant="secondary"
                disabled={!currentAsset}
                onClick={() => void share(true)}
              >
                <Share2 size={16} aria-hidden="true" />
                Share image
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <a
                href={links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <a href={links.x} target="_blank" rel="noopener noreferrer">
                X
              </a>
            </div>
            {notice && (
              <p role="status" className="text-sm text-success">
                {notice}
              </p>
            )}
            {failure && (
              <>
                <Alert>{failure}</Alert>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFailure("");
                    setRetry((value) => value + 1);
                  }}
                >
                  Retry image
                </Button>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
