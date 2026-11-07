"use client";

import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

export function EventThumbnail({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <div className="relative aspect-square w-full self-start overflow-hidden rounded-lg border border-line bg-paper">
      {imageUrl && imageUrl !== failedUrl ? (
        <Image
          src={imageUrl}
          alt={`${name || "Event"} cover`}
          fill
          unoptimized
          sizes="(min-width: 768px) 112px, 80px"
          className="object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div
          className="flex aspect-square items-center justify-center text-muted"
          aria-label="No event cover"
        >
          <CalendarDays className="size-7" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
