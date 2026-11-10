import type { CSSProperties } from "react";

export function BrandMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-1 -1 38 38"
      width="1em"
      height="1em"
      className={["trybe-brand-mark", className].filter(Boolean).join(" ")}
      shapeRendering="geometricPrecision"
      style={{
        display: "inline-block",
        ...(style?.display === "flex"
          ? {}
          : { verticalAlign: "middle" as const }),
        flexShrink: 0,
        ...style,
      }}
    >
      <g
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M 19.737 11.736 C 20.529 8.222 27.880 8.947 29.207 7.731" />
        <path d="M 23.657 14.799 C 26.702 12.874 31.387 18.584 33.186 18.663" />
        <path d="M 24.264 19.737 C 27.778 20.529 27.053 27.880 28.269 29.207" />
        <path d="M 21.201 23.657 C 23.126 26.702 17.416 31.387 17.337 33.186" />
        <path d="M 16.263 24.264 C 15.471 27.778 8.120 27.053 6.793 28.269" />
        <path d="M 12.343 21.201 C 9.298 23.126 4.613 17.416 2.814 17.337" />
        <path d="M 11.736 16.263 C 8.222 15.471 8.947 8.120 7.731 6.793" />
        <path d="M 14.799 12.343 C 12.874 9.298 18.584 4.613 18.663 2.814" />
      </g>
      <circle cx="18" cy="18" r="5" fill="currentColor" />
    </svg>
  );
}
