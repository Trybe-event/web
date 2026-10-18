import type { Metadata } from "next";

import { InboxList } from "./inbox-list";

export const metadata: Metadata = { title: "Inbox" };

// The list is a client concern: it reads GET /conversations and GET /me/unread
// through the same-origin /api proxy and keeps the counts live from the
// notification stream. The layout guards the page.
export default function InboxPage() {
  return <InboxList />;
}
