"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import {
  TAB_EMPTY,
  TAB_ORDER,
  actionFailureMessage,
  actionLabel,
  actionList,
  actionSuccessMessage,
  conflict,
  connectedLabel,
  eventSlugs,
  indexOfId,
  insertAt,
  orderedConnections,
  orderedRequests,
  pendingOnly,
  profileHref,
  refetchAfter,
  removeById,
  requestedLabel,
  retryable,
  sharedProfile,
  subtitleOf,
  tabId,
  tabLabel,
  tabPanelId,
  type ConnectionAction,
  type RequestList,
  type Tab,
} from "@/lib/connections";

type Request = Schemas["ConnectionRequest"];
type Connection = Schemas["Connection"];

type Notice = { tone: "danger" | "success"; message: string };
// A failed action is retried from the notice, not from the row it belonged to:
// the row may be gone from the list while the error is still on screen.
type Retry =
  | { kind: "request"; request: Request; action: ConnectionAction }
  | { kind: "connection"; connection: Connection };

const EMPTY_SLUGS = new Map<string, string>();

// The lists come straight from the API: GET /me/connection-requests (incoming and
// outgoing) and GET /me/connections. The page never derives a connection from a
// request id — accepting refetches the accepted list, which only the server fills.
export function ConnectionsTabs() {
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [connected, setConnected] = useState<Connection[]>([]);
  const [slugByEventId, setSlugByEventId] =
    useState<Map<string, string>>(EMPTY_SLUGS);
  const [tab, setTab] = useState<Tab>("incoming");
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingAction, setActingAction] = useState<ConnectionAction | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [retry, setRetry] = useState<Retry | null>(null);
  const [confirming, setConfirming] = useState<Connection | null>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const requestList = useCallback(
    (list: RequestList) => (list === "incoming" ? incoming : outgoing),
    [incoming, outgoing],
  );

  const setRequestList = useCallback((list: RequestList, items: Request[]) => {
    if (list === "incoming") setIncoming(items);
    else setOutgoing(items);
  }, []);

  const loadRequests = useCallback(async () => {
    const [incomingResult, outgoingResult] = await Promise.all([
      api.GET("/me/connection-requests", {
        params: { query: { direction: "incoming" } },
      }),
      api.GET("/me/connection-requests", {
        params: { query: { direction: "outgoing" } },
      }),
    ]);
    if (incomingResult.data)
      setIncoming(orderedRequests(pendingOnly(incomingResult.data.items)));
    if (outgoingResult.data)
      setOutgoing(orderedRequests(pendingOnly(outgoingResult.data.items)));
    return incomingResult.error ?? outgoingResult.error ?? null;
  }, []);

  const loadConnections = useCallback(async () => {
    const { data } = await api.GET("/me/connections");
    if (data) setConnected(orderedConnections(data.items));
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [failure] = await Promise.all([
        loadRequests(),
        loadConnections(),
        // Memberships only supply the slug a profile link needs; without them the
        // cards simply carry no link, so this failure isn't a page failure.
        api.GET("/me/events").then(({ data }) => {
          if (active && data) setSlugByEventId(eventSlugs(data.items));
        }),
      ]);
      if (!active) return;
      setLoadFailure(
        failure
          ? errorMessage(failure, "We couldn't load your connections.")
          : null,
      );
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [loadRequests, loadConnections]);

  async function act(request: Request, action: ConnectionAction) {
    const list = actionList(action);
    const listBefore = requestList(list);
    const indexBefore = indexOfId(listBefore, request.id);
    setActingId(request.id);
    setActingAction(action);
    setNotice(null);
    setRetry(null);
    // Optimistic: the row leaves the list its action belongs to. An accept adds
    // nothing here, because only the server can issue a connection.
    setRequestList(list, removeById(listBefore, request.id));

    let status: number | undefined;
    let failure: { code?: string; message?: string } | null = null;
    try {
      const result = await api.POST(
        "/connection-requests/{requestId}/{action}",
        { params: { path: { requestId: request.id, action } } },
      );
      status = result.response.status;
      failure =
        (result.error as { code?: string; message?: string } | undefined) ??
        null;
    } catch {
      status = undefined; // the request never reached the server
    }
    setActingId(null);
    setActingAction(null);

    if (failure || status === undefined || status >= 400) {
      setRequestList(list, insertAt(listBefore, indexBefore, request));
      setNotice({
        tone: "danger",
        message: actionFailureMessage(action, failure, status),
      });
      if (retryable(status)) setRetry({ kind: "request", request, action });
      // A conflict means someone else decided first: show the server's state.
      if (conflict(failure, status)) {
        await loadRequests();
        await loadConnections();
      }
      return;
    }

    // The server's answer decides the lists: an acceptance only exists in
    // GET /me/connections, so both lists are refetched before the notice.
    if (refetchAfter(action).includes("connections")) await loadConnections();
    await loadRequests();
    setNotice({
      tone: "success",
      message: actionSuccessMessage(action, request.other.full_name),
    });
  }

  async function disconnect(connection: Connection) {
    const indexBefore = indexOfId(connected, connection.id);
    setActingId(connection.id);
    setActingAction(null);
    setNotice(null);
    setRetry(null);
    setConnected(removeById(connected, connection.id));

    let status: number | undefined;
    let failure: { message?: string } | null = null;
    try {
      const result = await api.DELETE("/connections/{connectionId}", {
        params: { path: { connectionId: connection.id } },
      });
      status = result.response.status;
      failure = (result.error as { message?: string } | undefined) ?? null;
    } catch {
      status = undefined;
    }
    setActingId(null);
    setConfirming(null);

    if (failure || status === undefined || status >= 400) {
      setConnected(insertAt(connected, indexBefore, connection));
      setNotice({
        tone: "danger",
        message: errorMessage(failure, "We couldn't disconnect. Try again."),
      });
      if (retryable(status)) setRetry({ kind: "connection", connection });
      return;
    }
    setNotice({
      tone: "success",
      message: `You're no longer connected with ${connection.other.full_name}.`,
    });
  }

  function runRetry() {
    if (!retry) return;
    if (retry.kind === "request") void act(retry.request, retry.action);
    else void disconnect(retry.connection);
  }

  function selectTab(next: Tab) {
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  // Arrow keys move between tabs, Home and End jump to the ends: the pattern a
  // tablist is expected to follow when it is reached by keyboard.
  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = TAB_ORDER.indexOf(tab);
    const last = TAB_ORDER.length - 1;
    let next: Tab | undefined;
    if (event.key === "ArrowRight")
      next = TAB_ORDER[(current + 1) % TAB_ORDER.length];
    else if (event.key === "ArrowLeft")
      next = TAB_ORDER[(current - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (event.key === "Home") next = TAB_ORDER[0];
    else if (event.key === "End") next = TAB_ORDER[last];
    if (!next) return;
    event.preventDefault();
    selectTab(next);
  }

  const counts: Record<Tab, number> = {
    incoming: incoming.length,
    outgoing: outgoing.length,
    connected: connected.length,
  };

  const requests: Record<RequestList, Request[]> = { incoming, outgoing };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Your connections</h1>
      <p className="mt-2 text-muted">
        Answer requests from people at your events, or see who you&apos;re
        already connected with.
      </p>

      {loadFailure && (
        <div className="mt-6">
          <Alert>{loadFailure}</Alert>
        </div>
      )}

      {notice && (
        <div className="mt-6">
          <Alert tone={notice.tone}>{notice.message}</Alert>
          {retry && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={runRetry}
            >
              Try again
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Connections"
            onKeyDown={onTabKeyDown}
            className="mt-8 flex flex-wrap gap-2"
          >
            {TAB_ORDER.map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="tab"
                id={tabId(candidate)}
                aria-selected={tab === candidate}
                aria-controls={tabPanelId(candidate)}
                tabIndex={tab === candidate ? 0 : -1}
                ref={(element) => {
                  tabRefs.current[candidate] = element;
                }}
                onClick={() => setTab(candidate)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                  tab === candidate
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink hover:bg-paper"
                }`}
              >
                {tabLabel(candidate, counts[candidate])}
              </button>
            ))}
          </div>

          <section
            role="tabpanel"
            id={tabPanelId(tab)}
            aria-labelledby={tabId(tab)}
            className="mt-6 flex flex-col gap-3"
          >
            {tab === "connected" ? (
              connected.length === 0 ? (
                <EmptyState title={TAB_EMPTY.connected.title}>
                  <p>{TAB_EMPTY.connected.body}</p>
                </EmptyState>
              ) : (
                connected.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    href={profileHref(
                      slugByEventId.get(connection.origin_event_id),
                      connection.other.attendee_id,
                    )}
                    onDisconnect={() => setConfirming(connection)}
                  />
                ))
              )
            ) : requests[tab].length === 0 ? (
              <EmptyState title={TAB_EMPTY[tab].title}>
                <p>{TAB_EMPTY[tab].body}</p>
              </EmptyState>
            ) : (
              requests[tab].map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  actions={
                    tab === "incoming" ? ["accept", "reject"] : ["cancel"]
                  }
                  busyAction={actingId === request.id ? actingAction : null}
                  onAction={act}
                />
              ))
            )}
          </section>
        </>
      )}

      {confirming && (
        <Dialog
          open
          onClose={() => setConfirming(null)}
          title={`Disconnect from ${confirming.other.full_name}?`}
          description="You will no longer be able to message each other. They stay in your existing conversations as history."
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Keep connection
              </Button>
              <Button
                variant="danger"
                loading={actingId === confirming.id}
                onClick={() => void disconnect(confirming)}
              >
                Disconnect
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

function RequestCard({
  request,
  actions,
  busyAction,
  onAction,
}: {
  request: Request;
  actions: ConnectionAction[];
  busyAction: ConnectionAction | null;
  onAction: (request: Request, action: ConnectionAction) => void;
}) {
  const profile = sharedProfile(request.other);
  const subtitle = subtitleOf(profile);
  const asked = requestedLabel(request.created_at);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={profile.full_name} src={profile.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile.full_name}</p>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          {request.message && (
            <p className="mt-1 text-sm text-muted">{request.message}</p>
          )}
          {asked && (
            <time
              dateTime={request.created_at}
              className="mt-1 block text-xs text-muted"
            >
              {asked}
            </time>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={action === "accept" ? "primary" : "secondary"}
            disabled={busyAction !== null && busyAction !== action}
            loading={busyAction === action}
            onClick={() => onAction(request, action)}
          >
            {actionLabel(action)}
          </Button>
        ))}
      </div>
    </Card>
  );
}

function ConnectionCard({
  connection,
  href,
  onDisconnect,
}: {
  connection: Connection;
  href: string | null;
  onDisconnect: () => void;
}) {
  const profile = sharedProfile(connection.other);
  const subtitle = subtitleOf(profile);
  const connectedOn = connectedLabel(connection.connected_at);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={profile.full_name} src={profile.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile.full_name}</p>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          {connectedOn && (
            <time
              dateTime={connection.connected_at}
              className="mt-1 block text-xs text-muted"
            >
              {connectedOn}
            </time>
          )}
        </div>
        <Badge tone="success">Connected</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        {href && (
          <ButtonLink href={href} variant="secondary" size="sm">
            View profile
          </ButtonLink>
        )}
        <Button variant="danger" size="sm" onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>
    </Card>
  );
}
