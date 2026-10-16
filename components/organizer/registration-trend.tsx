import { useId } from "react";

import type { RegistrationPoint } from "@/lib/organizer-dashboard";

export function RegistrationTrend({ points }: { points: RegistrationPoint[] }) {
  const titleId = useId();
  const sortedPoints = [...points].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
  const firstPoint = sortedPoints[0];
  const lastPoint = sortedPoints[sortedPoints.length - 1];
  if (!firstPoint || !lastPoint)
    return <p className="text-sm text-muted">No daily registrations yet.</p>;
  const maximum = Math.max(
    1,
    ...sortedPoints.map((point) => point.registrations),
  );
  const coordinates = sortedPoints
    .map(
      (point, index) =>
        `${sortedPoints.length === 1 ? 120 : 6 + (index / (sortedPoints.length - 1)) * 228},${54 - (point.registrations / maximum) * 42}`,
    )
    .join(" ");
  return (
    <figure className="min-w-0">
      <svg
        viewBox="0 0 240 60"
        role="img"
        aria-labelledby={titleId}
        className="h-16 w-full text-accent-ink"
      >
        <title id={titleId}>
          {`Daily registrations: ${sortedPoints
            .map((point) => `${point.date}: ${point.registrations}`)
            .join("; ")}`}
        </title>
        <path d="M6 55H234" stroke="currentColor" opacity="0.2" />
        <polyline
          points={coordinates}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {sortedPoints.length === 1 && (
          <circle
            cx="120"
            cy={54 - (firstPoint.registrations / maximum) * 42}
            r="3"
            fill="currentColor"
          />
        )}
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-1 text-xs text-muted">
        <span>{firstPoint.date}</span>
        <span>{lastPoint.date}</span>
      </figcaption>
      <p className="mt-1 text-xs text-muted">
        Daily registrations in the event timezone.
      </p>
    </figure>
  );
}
