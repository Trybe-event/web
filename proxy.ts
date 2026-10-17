// Next.js 16 request proxy (formerly middleware). Clerk attaches the session to every
// request; pages and route handlers decide access themselves on the server. Without Clerk
// keys the app still serves public pages and explains that sign-in isn't available.
import { clerkMiddleware } from "@clerk/nextjs/server";
import { localAppRedirect } from "./lib/local-app-origin";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

const withClerk = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const canonicalUrl = localAppRedirect(
    request.url,
    request.method,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV,
  );
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 307);

  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    // Skip Next internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
