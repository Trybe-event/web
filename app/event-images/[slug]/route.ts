import { NextResponse } from "next/server";
import { serverApi } from "@/lib/api/server";

// Emails keep this permanent invitation-based URL, not an expiring storage
// signature. The API exposes the same cover to anyone holding this invitation.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    const { slug } = await params;
    const client = await serverApi();
    const { data, response } = await client.GET("/e/{slug}", {
      params: { path: { slug } },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return new Response(null, {
        status: response.status === 404 ? 404 : 503,
        headers,
      });
    if (!data?.image_url) return new Response(null, { status: 404, headers });
    const imageUrl = new URL(data.image_url);
    if (
      imageUrl.protocol !== "https:" ||
      imageUrl.username ||
      imageUrl.password
    )
      return new Response(null, { status: 502, headers });
    return NextResponse.redirect(imageUrl, { status: 307, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
