import { api, errorMessage } from "../api/client";
import { orderedConversations, unreadMessages } from "./inbox";

export async function loadInboxSnapshot(signal?: AbortSignal) {
  try {
    const [conversations, totals] = await Promise.all([
      api.GET("/conversations", { signal }),
      api.GET("/me/unread", { signal }),
    ]);
    if (
      !conversations.response.ok ||
      !totals.response.ok ||
      !conversations.data ||
      !totals.data
    )
      return {
        kind: "unavailable",
        message: errorMessage(
          conversations.error ?? totals.error,
          "We couldn't load your inbox. Try again.",
        ),
      } as const;
    return {
      kind: "loaded",
      conversations: orderedConversations(conversations.data.items),
      unread: unreadMessages(totals.data),
    } as const;
  } catch {
    return {
      kind: "unavailable",
      message:
        "We couldn't load your inbox. Check your connection and try again.",
    } as const;
  }
}
