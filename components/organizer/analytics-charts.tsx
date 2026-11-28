import { hourLabel } from "@/lib/event-analytics";

// Single-series charts for the analytics page. One validated bar colour
// (--chart-bar, light and dark), values and labels in text colours, a hover title on
// every mark and a table view, so no figure depends on colour or on seeing the bars.

export function BarList({
  rows,
  unit,
  empty = "Nothing to show yet.",
}: {
  rows: { label: string; value: number; note?: string }[];
  unit: string;
  empty?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${row.value} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {row.value.toLocaleString("en")}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="mt-1 h-2 w-full rounded bg-line/60"
          >
            {row.value > 0 && (
              <div
                className="h-2 rounded"
                style={{
                  width: `${Math.max(2, (row.value / max) * 100)}%`,
                  background: "var(--chart-bar)",
                }}
              />
            )}
          </div>
          {row.note && <p className="mt-1 text-xs text-muted">{row.note}</p>}
        </li>
      ))}
    </ul>
  );
}

// HourColumns shows arrivals for one day, all 24 hours on one time axis.
export function HourColumns({
  hours,
}: {
  hours: { hour: number; checked_in: number }[];
}) {
  const max = Math.max(1, ...hours.map((h) => h.checked_in));
  const peak = hours.reduce(
    (best, h) => (h.checked_in > best.checked_in ? h : best),
    { hour: -1, checked_in: 0 },
  );
  return (
    <figure className="space-y-2">
      <div
        aria-hidden="true"
        className="flex h-44 items-end gap-[2px] border-b border-line pt-6"
      >
        {hours.map((h) => (
          <div
            key={h.hour}
            title={`${hourLabel(h.hour)}: ${h.checked_in} checked in`}
            className="relative flex h-full flex-1 items-end"
          >
            {h.checked_in > 0 && (
              <div
                className="w-full rounded-t"
                style={{
                  height: `${(h.checked_in / max) * 100}%`,
                  minHeight: 4,
                  background: "var(--chart-bar)",
                }}
              />
            )}
            {h.hour === peak.hour && peak.checked_in > 0 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs tabular-nums text-ink">
                {peak.checked_in}
              </span>
            )}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex text-[11px] text-muted">
        {hours.map((h) => (
          <span key={h.hour} className="flex-1 text-center">
            {h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        Check-ins by hour. The table below lists every hour.
      </figcaption>
    </figure>
  );
}
