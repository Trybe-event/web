"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api/client";
import {
  chatSocketUrl,
  parseServerFrame,
  reconnectDelay,
  shouldReconnect,
  socketOrigin,
  subscribeFrame,
} from "@/lib/messaging/chat-socket";
import type { Message } from "@/lib/messaging/thread";

// MSW answers fetch, not WebSocket, and a deployment may not configure the
// public API origin. Both cases fall back to a REST refresh on an interval, so
// the thread still converges without a live socket.
const mockMode = process.env.NEXT_PUBLIC_API_MOCKS === "1";
const POLL_MS = 10_000;
const TICKET_PATH = "/ws/tickets";
const MESSAGES_PATH = "/conversations/{conversationId}/messages";

export type LiveStatus =
  "connecting" | "live" | "polling" | "retrying" | "offline";

type LiveHandlers = {
  conversationId: string;
  enabled: boolean;
  /** New or updated messages, from a socket frame or a REST refresh. */
  onMessages: (messages: Message[]) => void;
  /** The socket reopened after a gap; history must be fetched again. */
  onReconnect: () => void;
};

/**
 * Keeps one thread live (web#19). The socket is authorized with a single-use
 * ticket, reopened with exponential backoff, and every reopen asks the caller to
 * backfill from REST — the socket only tells us something arrived, never where
 * the conversation stands. Merge rules drop duplicates.
 */
export function useConversationLive({
  conversationId,
  enabled,
  onMessages,
  onReconnect,
}: LiveHandlers): { status: LiveStatus } {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const messagesRef = useRef(onMessages);
  const reconnectRef = useRef(onReconnect);
  useEffect(() => {
    messagesRef.current = onMessages;
    reconnectRef.current = onReconnect;
  }, [onMessages, onReconnect]);

  useEffect(() => {
    if (!enabled) return;
    const origin = mockMode ? null : socketOrigin();

    if (!origin || typeof WebSocket === "undefined") {
      let active = true;
      const refresh = async () => {
        const { data } = await api.GET(MESSAGES_PATH, {
          params: { path: { conversationId }, query: { limit: 25 } },
        });
        if (!active) return;
        setStatus("polling");
        if (data) messagesRef.current(data.items);
      };
      void refresh();
      const poll = setInterval(() => void refresh(), POLL_MS);
      return () => {
        active = false;
        clearInterval(poll);
      };
    }

    let active = true;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let openedBefore = false;

    const schedule = () => {
      if (!active) return;
      setStatus("retrying");
      retry = setTimeout(() => void connect(), reconnectDelay(attempt));
      attempt += 1;
    };

    const connect = async () => {
      // A ticket works once, within 60 s, so every attempt asks for a new one.
      const { data } = await api.POST(TICKET_PATH);
      if (!active) return;
      const url = data ? chatSocketUrl(origin, data.ticket) : null;
      if (!url) {
        schedule();
        return;
      }

      socket = new WebSocket(url);
      socket.onopen = () => {
        if (!active) return;
        attempt = 0;
        setStatus("live");
        socket?.send(JSON.stringify(subscribeFrame(conversationId)));
        if (openedBefore) reconnectRef.current();
        openedBefore = true;
      };
      socket.onmessage = (event) => {
        const frame = parseServerFrame(event.data);
        if (!frame) return;
        if (frame.type === "message") {
          if (frame.message.conversation_id === conversationId)
            messagesRef.current([frame.message]);
          return;
        }
        // The socket stays open for an error frame; the next action can fix it.
        setStatus("retrying");
      };
      socket.onclose = (event) => {
        if (!active) return;
        if (shouldReconnect(event.code)) {
          schedule();
        } else {
          setStatus("offline");
        }
      };
      socket.onerror = () => {
        // onclose runs after onerror and owns the retry decision.
        socket?.close();
      };
    };

    void connect();
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      socket?.close(1000);
    };
  }, [conversationId, enabled]);

  return { status };
}
