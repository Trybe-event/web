"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

type Tab = "incoming" | "outgoing" | "connected";

type RequestWithDirection = Schemas["ConnectionRequest"] & {
  direction: "incoming" | "outgoing";
};

type State = {
  tab: Tab;
  incoming: RequestWithDirection[];
  outgoing: RequestWithDirection[];
  connected: Schemas["Connection"][];
  loading: boolean;
  failure: string | null;
};

const EMPTY_INCOMING: RequestWithDirection[] = [];
const EMPTY_OUTGOING: RequestWithDirection[] = [];
const EMPTY_CONNECTED: Schemas["Connection"][] = [];

export function ConnectionsTabs(_props: { accountId: string }) {
  const [state, setState] = useState<State>({
    tab: "incoming",
    incoming: EMPTY_INCOMING,
    outgoing: EMPTY_OUTGOING,
    connected: EMPTY_CONNECTED,
    loading: true,
    failure: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api
        .GET("/me/connection-requests", {
          params: { query: { direction: "incoming" } },
        })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (data) return data.items as RequestWithDirection[];
          throw error;
        }),
      api
        .GET("/me/connection-requests", {
          params: { query: { direction: "outgoing" } },
        })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (data) return data.items as RequestWithDirection[];
          throw error;
        }),
      api
        .GET("/me/connections")
        .then(({ data, error }) => {
          if (cancelled) return;
          if (data) return data.items as Schemas["Connection"][];
          throw error;
        }),
    ])
      .then(([incoming, outgoing, connected]) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          incoming: incoming ?? EMPTY_INCOMING,
          outgoing: outgoing ?? EMPTY_OUTGOING,
          connected: connected ?? EMPTY_CONNECTED,
          loading: false,
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          failure: errorMessage(error, "We couldn't load your connections."),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeIncoming = state.incoming.filter((r) => r.direction === "incoming");
  const activeOutgoing = state.outgoing.filter((r) => r.direction === "outgoing");

  function setTab(tab: Tab) {
    setState((s) => ({ ...s, tab }));
  }

  async function handleDisconnect(connectionId: string, connected: Schemas["Connection"][], setStateFn: (u: (s: State) => State) => void) {
    setStateFn((s) => ({
      ...s,
      connected: s.connected.filter((c) => c.id !== connectionId),
    }));
    const { error } = await api.DELETE("/connections/{connectionId}", {
      params: { path: { connectionId } },
    });
    if (error) {
      setStateFn((s) => ({
        ...s,
        connected: s.connected.filter((c) => c.id !== connectionId).concat(
          connected.find((c) => c.id === connectionId)!,
        ),
      }));
    }
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <Link href="/attendee" aria-label="Trybe workspace home">
          <span className="workspace-logo">Trybe</span>
        </Link>
        <div>
          <span className="workspace-badge">Attendee workspace</span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold">Your connections</h1>
        <p className="mt-2 text-muted">
          Accept requests from people at your events, or see who you&apos;re already
          connected with.
        </p>

        {state.failure && (
          <div className="mt-6 rounded-lg border border-danger/20 bg-danger/5 p-4">
            {state.failure}
          </div>
        )}

        {state.loading ? (
          <div className="mt-8 flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <div role="tablist" aria-label="Connections" className="mt-8 flex gap-2">
            {(["incoming", "outgoing", "connected"] as Tab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                type="button"
                aria-selected={state.tab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setTab(tab)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  state.tab === tab
                    ? "border-ink aria-selected:bg-ink aria-selected:text-paper"
                    : "border-line aria-selected:text-paper"
                }`}
              >
                {tab === "incoming"
                  ? `Incoming (${activeIncoming.length})`
                  : tab === "outgoing"
                    ? `Outgoing (${activeOutgoing.length})`
                    : `Connected (${state.connected.length})`}
              </button>
            ))}
          </div>
        )}

        {state.loading ? (
          <Skeleton className="mt-6 h-64" />
        ) : state.tab === "incoming" ? (
          <div id="panel-incoming" role="tabpanel" aria-label="Incoming requests">
            {activeIncoming.length === 0 ? (
              <EmptyState title="No pending requests">
                <p className="text-muted">
                  When someone at your events sends you a connection request, it
                  will appear here.
                </p>
                <p className="mt-2 text-muted">
                  When someone at your events sends you a connection request, it
                  will appear here.
                </p>
              </EmptyState>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {activeIncoming.map((request) => (
                  <IncomingRequest
                    key={request.id}
                    request={request}
                    optimisticKey={request.id}
                    setState={setState}
                  />
                ))}
              </div>
            )}
          </div>
        ) : state.tab === "outgoing" ? (
          <div id="panel-outgoing" role="tabpanel" aria-label="Outgoing requests">
            {activeOutgoing.length === 0 ? (
              <EmptyState title="No outgoing requests">
                <p className="text-muted">
                  Requests you&apos;ve sent to people at your events will appear here.
                </p>
              </EmptyState>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {activeOutgoing.map((request) => (
                  <OutgoingRequest
                    key={request.id}
                    request={request}
                    optimisticKey={request.id}
                    setState={setState}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div id="panel-connected" role="tabpanel" aria-label="Connected">
            {state.connected.length === 0 ? (
              <EmptyState title="No connections yet">
                <p className="text-muted">
                  Accept a request or send one to someone at your event to start
                  connecting.
                </p>
                <p className="mt-2 text-muted">
                  Accept a request or send one to someone at your event to start
                  connecting.
                </p>
              </EmptyState>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {state.connected.map((connection) => (
                  <ConnectedCard
                    key={connection.id}
                    connection={connection}
                    onDisconnect={() => handleDisconnect(connection.id, state.connected, setState)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// IncomingRequest shows a pending request from someone else, with accept and reject.
function IncomingRequest({
  request,
  optimisticKey,
  setState,
}: {
  request: RequestWithDirection;
  optimisticKey: string;
  setState: (updater: (s: State) => State) => void;
}) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "accept" | "reject") {
    setActing(true);
    setError(null);
    setState((s) => {
      const list = action === "accept" ? s.incoming : s.outgoing;
      return {
        ...s,
        [action === "accept" ? "incoming" : "outgoing"]: list.filter(
          (r) => r.id !== optimisticKey,
        ),
      };
    });

    const { error: actedError } = await api.POST("/connection-requests/{requestId}/{action}", {
      params: { path: { requestId: request.id, action } },
    });
    if (actedError) {
      setError(errorMessage(actedError, "Couldn't update the request."));
      setState((s) => {
        const list = action === "accept" ? s.incoming : s.outgoing;
        return {
          ...s,
          [action === "accept" ? "incoming" : "outgoing"]: list.filter(
            (r) => r.id !== optimisticKey,
          ).concat(request),
        };
      });
      setActing(false);
      return;
    }

    if (action === "accept") {
      setState((s) => ({
        ...s,
        connected: [
          ...s.connected,
          {
            id: request.id,
            origin_event_id: request.event_id,
            connected_at: new Date().toISOString(),
            other: request.other,
          },
        ],
      }));
    }
    setActing(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={request.other.full_name} src={request.other.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{request.other.full_name}</p>
          {request.other.role && (
            <p className="text-sm text-muted">
              {request.other.role}
              {request.other.organization ? ` · ${request.other.organization}` : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            {new Date(request.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>
      {request.other.bio && (
        <p className="text-sm text-muted">{request.other.bio}</p>
      )}
      {request.other.skills && request.other.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {request.other.skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
      {request.message && (
        <p className="text-sm">
          <span className="font-semibold">Message:</span> {request.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          loading={acting}
          disabled={acting}
          onClick={() => act("reject")}
        >
          Reject
        </Button>
        <Button loading={acting} disabled={acting} onClick={() => act("accept")}>
          Accept
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}

// OutgoingRequest shows a request the attendee sent, with a cancel button.
function OutgoingRequest({
  request,
  optimisticKey,
  setState,
}: {
  request: RequestWithDirection;
  optimisticKey: string;
  setState: (updater: (s: State) => State) => void;
}) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setActing(true);
    setError(null);
    setState((s) => ({
      ...s,
      outgoing: s.outgoing.filter((r) => r.id !== optimisticKey),
    }));

    const { error: actedError } = await api.POST("/connection-requests/{requestId}/{action}", {
      params: { path: { requestId: request.id, action: "cancel" } },
    });
    if (actedError) {
      setError(errorMessage(actedError, "Couldn't cancel the request."));
      setState((s) => ({
        ...s,
        outgoing: s.outgoing.filter((r) => r.id !== optimisticKey).concat(request),
      }));
      setActing(false);
      return;
    }
    setActing(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={request.other.full_name} src={request.other.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{request.other.full_name}</p>
          {request.other.role && (
            <p className="text-sm text-muted">
              {request.other.role}
              {request.other.organization ? ` · ${request.other.organization}` : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Sent {new Date(request.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>
      {request.other.bio && (
        <p className="text-sm text-muted">{request.other.bio}</p>
      )}
      {request.other.skills && request.other.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {request.other.skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="secondary" loading={acting} disabled={acting} onClick={cancel}>
          Cancel request
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}

// ConnectedCard shows an accepted connection with a disconnect button and profile link.
function ConnectedCard({
  connection,
  onDisconnect,
}: {
  connection: Schemas["Connection"];
  onDisconnect: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnectConn() {
    setActing(true);
    setError(null);
    onDisconnect();
    const { error: actedError } = await api.DELETE("/connections/{connectionId}", {
      params: { path: { connectionId: connection.id } },
    });
    if (actedError) {
      setError(errorMessage(actedError, "Couldn't disconnect."));
      onDisconnect();
      setActing(false);
      return;
    }
    setActing(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={connection.other.full_name} src={connection.other.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{connection.other.full_name}</p>
          {connection.other.role && (
            <p className="text-sm text-muted">
              {connection.other.role}
              {connection.other.organization ? ` · ${connection.other.organization}` : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Connected {new Date(connection.connected_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        <Badge>Connected</Badge>
      </div>
      {connection.other.bio && (
        <p className="text-sm text-muted">{connection.other.bio}</p>
      )}
      {connection.other.skills && connection.other.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {connection.other.skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
      {connection.other.links && connection.other.links.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {connection.other.links.map((l, i) => (
            <li key={i}>
              <span className="font-semibold">{l.kind}:</span> {l.value}
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" loading={acting} disabled={acting} onClick={disconnectConn}>
          Disconnect
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
