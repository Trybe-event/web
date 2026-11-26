// The event-scoped workspace shows the attendee's network for one event only. These
// helpers keep that filtering and the links in one place, so the general screens
// (connections, inbox, profile) can be reused inside an event unchanged.

export type EventScope = { eventId: string; slug: string };

const base = (slug: string) => `/events/${encodeURIComponent(slug)}`;

// Where each screen lives: inside the event when scoped, otherwise the general
// attendee workspace.
export function scopedPaths(scope?: EventScope) {
  if (!scope)
    return {
      home: "/attendee",
      connections: "/attendee/connections",
      inbox: "/attendee/inbox",
      conversation: (id: string) => `/attendee/inbox/${encodeURIComponent(id)}`,
      profile: "/attendee/profile",
    };
  const root = base(scope.slug);
  return {
    home: root,
    connections: `${root}/connections`,
    inbox: `${root}/messages`,
    conversation: (id: string) => `${root}/messages/${encodeURIComponent(id)}`,
    profile: `${root}/profile`,
  };
}

// Requests carry the event they were sent at; connections the event they were made at.
export function requestsAt<T extends { event_id: string }>(
  items: T[],
  scope?: EventScope,
) {
  return scope
    ? items.filter((item) => item.event_id === scope.eventId)
    : items;
}

export function connectionsAt<T extends { origin_event_id: string }>(
  items: T[],
  scope?: EventScope,
) {
  return scope
    ? items.filter((item) => item.origin_event_id === scope.eventId)
    : items;
}

// A conversation belongs to the event its connection was made at.
export function conversationsAt<T extends { connection_id: string }>(
  items: T[],
  connections: { id: string; origin_event_id: string }[],
  scope?: EventScope,
) {
  if (!scope) return items;
  const ids = new Set(connectionsAt(connections, scope).map((c) => c.id));
  return items.filter((item) => ids.has(item.connection_id));
}
