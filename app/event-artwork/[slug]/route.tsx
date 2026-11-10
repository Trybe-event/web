import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";
import { getPublicEvent } from "@/lib/events";
import { isEventSlug } from "@/lib/routes";
import {
  ARTWORK_FORMATS,
  ARTWORK_THEMES,
  type ArtworkFormat,
  type ArtworkTheme,
} from "@/lib/event-artwork";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const search = new URL(request.url).searchParams;
  const format = search.get("format") ?? "og";
  const theme = search.get("theme") ?? "forest";
  const headers = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
  };
  if (!isEventSlug(slug)) return new Response(null, { status: 404, headers });
  if (
    !Object.hasOwn(ARTWORK_FORMATS, format) ||
    !Object.hasOwn(ARTWORK_THEMES, theme)
  )
    return new Response(null, { status: 400, headers });
  const result = await getPublicEvent(slug);
  if (result.kind !== "found")
    return new Response(null, {
      status: result.kind === "not_found" ? 404 : 503,
      headers,
    });
  const event = result.event;
  const { width, height } = ARTWORK_FORMATS[format as ArtworkFormat];
  const colors = ARTWORK_THEMES[theme as ArtworkTheme];
  let image: string | undefined;
  if (event.image_url) {
    try {
      // The URL comes only from the API's signed event-cover field, never from
      // a query parameter. Do not turn this endpoint into an arbitrary image proxy.
      const url = new URL(event.image_url);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("Invalid storage URL");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      const type = response.headers.get("content-type")?.split(";")[0];
      if (
        !response.ok ||
        !["image/jpeg", "image/png", "image/webp"].includes(type ?? "")
      )
        throw new Error("Unavailable cover");
      const body = await response.arrayBuffer();
      if (body.byteLength > 5 * 1024 * 1024) throw new Error("Cover too large");
      image = `data:${type};base64,${Buffer.from(body).toString("base64")}`;
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
  const landscape = format === "og";
  const date = new Date(event.starts_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: event.timezone,
  });
  const posterWidth = landscape ? 430 : 850;
  const posterHeight = landscape
    ? 440
    : format === "story"
      ? 1100
      : format === "post"
        ? 620
        : 400;
  const rendered = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 56,
        backgroundImage: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        color: "#ffffff",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 38,
        }}
      >
        <div style={{ display: "flex", color: "#c3ef66", marginRight: 12 }}>
          <BrandMark
            style={{
              display: "flex",
              width: 36,
              height: 36,
            }}
          />
        </div>
        trybe.
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: landscape ? "row-reverse" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: landscape ? 40 : 44,
        }}
      >
        {image && (
          <div
            style={{
              display: "flex",
              width: posterWidth,
              height: posterHeight,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Native img is required by ImageResponse; preserve the complete poster. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              width={posterWidth}
              height={posterHeight}
              style={{ objectFit: "contain", borderRadius: 20 }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            ...(landscape ? { flex: 1 } : { width: "100%" }),
            backgroundColor: "rgba(255,255,255,0.10)",
            padding: 30,
            borderRadius: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize:
                event.name.length > 120
                  ? 30
                  : event.name.length > 65
                    ? 36
                    : landscape
                      ? 38
                      : 46,
              fontWeight: 700,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
          >
            {event.name}
          </div>
          <div style={{ display: "flex", fontSize: 25, marginTop: 20 }}>
            {date} ({event.timezone})
          </div>
          <div style={{ display: "flex", fontSize: 25, marginTop: 12 }}>
            {event.venue_name ||
              (event.format === "virtual"
                ? "Online event"
                : "Join the event on Trybe")}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 23,
          marginTop: 34,
        }}
      >
        <span>{event.organizer_name || "Connection with convenience."}</span>
        <span>{slug.toUpperCase()}</span>
      </div>
    </div>,
    { width, height, headers },
  );
  try {
    const imageBody = await rendered.arrayBuffer();
    return new Response(imageBody, {
      headers: { ...headers, "Content-Type": "image/png" },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
