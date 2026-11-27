import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { ConversationThread } from "@/components/messaging/conversation-thread";
import { scopedPaths } from "@/lib/event-scope";
import { requireEventWorkspace } from "@/lib/event-workspace";

const CONVERSATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Conversation" };
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// The API only returns conversations the caller is in, so the thread needs no
// extra check here; the event frame only decides where "Back" goes.
export default async function EventConversationPage({
  params,
}: {
  params: Promise<{ slug: string; conversationId: string }>;
}) {
  const { slug, conversationId } = await params;
  if (!CONVERSATION_ID.test(conversationId)) notFound();
  const workspace = await requireEventWorkspace(slug);
  if (workspace.kind !== "member") return null;
  return (
    <ConversationThread
      conversationId={conversationId}
      backHref={scopedPaths({ eventId: workspace.event.id, slug }).inbox}
    />
  );
}
