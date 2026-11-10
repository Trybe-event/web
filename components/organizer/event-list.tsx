"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";

type EventListItem = {
  id: string;
  name: string;
  status: "draft" | "published" | "ended";
  content: ReactNode;
};

export function OrganizerEventList({ items }: { items: EventListItem[] }) {
  const [selectedStatus, setSelectedStatus] = useState("published");
  const [search, setSearch] = useState("");
  const visibleItems = items.filter(
    (item) =>
      item.status === selectedStatus &&
      item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <div>
      <div className="organizer-list-toolbar">
        <div
          className="organizer-tabs"
          role="group"
          aria-label="Filter events by status"
        >
          {(
            [
              ["published", "Upcoming"],
              ["draft", "Drafts"],
              ["ended", "Past"],
            ] as const
          ).map(([status, label]) => (
            <button
              key={status}
              type="button"
              aria-pressed={selectedStatus === status}
              onClick={() => setSelectedStatus(status)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="organizer-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search your events</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your events"
          />
        </label>
      </div>
      <div className="space-y-4" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} hidden={!visibleItems.includes(item)}>
            {item.content}
          </div>
        ))}
        {!visibleItems.length && (
          <div className="organizer-empty">
            <strong>No events found</strong>
            <p>
              {search
                ? "Try a different event name."
                : "Create an event or try another status."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
