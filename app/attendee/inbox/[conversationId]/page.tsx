import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { ConversationThread } from "@/components/messaging/conversation-thread";

const CONVERSATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Conversation" };

// The on-screen keyboard resizes the chat instead of moving the page under it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// The inbox layout guards the whole subtree with requireAccount("attendee"), so
// a signed-out visitor is redirected before this page or its client bundle runs.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  if (!CONVERSATION_ID.test(conversationId)) notFound();
  return <ConversationThread conversationId={conversationId} />;
}
