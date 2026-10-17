"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Skeleton,
  TagInput,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import {
  directoryQuery,
  mergeDirectoryPage,
  type DirectoryFilters,
} from "@/lib/directory";
import { AttendeeCard } from "./attendee-card";

export function AttendeeDirectory({
  eventId,
  filters,
  slug,
}: {
  eventId: string;
  filters: DirectoryFilters;
  slug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [draftFilters, setDraftFilters] = useState(filters);
  const [profiles, setProfiles] = useState<Schemas["Profile"][]>();
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [failure, setFailure] = useState<string>();
  const [loading, setLoading] = useState(true);
  const activeRequest = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const load = useCallback(
    async (cursor?: string) => {
      if (activeRequest.current) return;
      activeRequest.current = true;
      const currentController = new AbortController();
      controller.current = currentController;
      setLoading(true);
      setFailure(undefined);
      try {
        const result = await api.GET("/events/{eventId}/attendees", {
          params: {
            path: { eventId },
            query: { ...filters, cursor, limit: 20 },
          },
          signal: AbortSignal.any([
            currentController.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (currentController.signal.aborted) return;
        if (!result.response.ok || !result.data)
          throw new Error(errorMessage(result.error));
        setProfiles((existing) =>
          mergeDirectoryPage(cursor ? existing || [] : [], result.data!.items),
        );
        if (cursor && result.data.next_cursor === cursor)
          throw new Error(
            "The next page could not be loaded. Try refreshing the directory.",
          );
        setNextCursor(result.data.next_cursor || null);
      } catch (error) {
        if (!currentController.signal.aborted)
          setFailure(
            error instanceof Error
              ? error.message
              : "Attendees could not be loaded. Try again.",
          );
      } finally {
        if (!currentController.signal.aborted) setLoading(false);
        if (controller.current === currentController)
          activeRequest.current = false;
      }
    },
    [eventId, filters],
  );
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      controller.current?.abort();
      activeRequest.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (!nextCursor || loading || failure || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          void load(nextCursor);
      },
      { rootMargin: "160px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [nextCursor, loading, failure, load]);
  function apply(nextFilters: DirectoryFilters) {
    const query = directoryQuery(nextFilters).toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }
  const selectedFilters = [
    ...(["q", "role", "goal"] as const)
      .filter((name) => filters[name])
      .map((name) => ({ name, value: filters[name] })),
    ...(["skill", "interest"] as const).flatMap((name) =>
      filters[name].map((value) => ({ name, value })),
    ),
  ];
  return (
    <div className="space-y-5">
      <Card>
        <form
          className="grid gap-4 lg:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draftFilters);
          }}
        >
          {(["q", "role", "goal"] as const).map((name) => (
            <Field
              key={name}
              label={
                name === "q"
                  ? "Search attendees"
                  : name === "role"
                    ? "Professional role"
                    : "Networking goal"
              }
              optional
            >
              {(props) => (
                <Input
                  {...props}
                  value={draftFilters[name]}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                />
              )}
            </Field>
          ))}
          {(["skill", "interest"] as const).map((name) => (
            <Field
              key={name}
              label={name === "skill" ? "Skills" : "Interests"}
              optional
              hint="Press comma or Enter to add a filter."
            >
              {(props) => (
                <TagInput
                  {...props}
                  value={draftFilters[name]}
                  onChange={(tags) =>
                    setDraftFilters((current) => ({ ...current, [name]: tags }))
                  }
                />
              )}
            </Field>
          ))}
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit">Apply filters</Button>
            <Button
              variant="secondary"
              onClick={() =>
                apply({ q: "", role: "", skill: [], interest: [], goal: "" })
              }
            >
              Clear filters
            </Button>
          </div>
        </form>
      </Card>
      {selectedFilters.length > 0 && (
        <div aria-label="Active filters" className="flex flex-wrap gap-2">
          {selectedFilters.map(({ name, value }) => (
            <Button
              key={`${name}:${value}`}
              size="sm"
              variant="secondary"
              aria-label={`Remove ${name} filter ${value}`}
              onClick={() =>
                apply({
                  ...filters,
                  [name]: Array.isArray(filters[name])
                    ? (filters[name] as string[]).filter(
                        (item) => item !== value,
                      )
                    : "",
                })
              }
            >
              {value} ×
            </Button>
          ))}
        </div>
      )}
      {failure && (
        <Alert>
          {failure}{" "}
          <Button
            variant="secondary"
            onClick={() => void load(nextCursor || undefined)}
          >
            Try again
          </Button>
        </Alert>
      )}
      {loading && !profiles && <Skeleton className="h-64" />}
      {profiles?.length === 0 && !failure && (
        <EmptyState title="No attendees match these filters">
          Try fewer filters or a broader search.
        </EmptyState>
      )}
      {profiles && (
        <div className="grid gap-4 xl:grid-cols-2">
          {profiles.map((profile) => (
            <AttendeeCard
              key={profile.attendee_id}
              profile={profile}
              slug={slug}
            />
          ))}
        </div>
      )}
      <p role="status" className="text-sm text-muted">
        {loading
          ? "Loading attendees..."
          : profiles
            ? `${profiles.length} attendees loaded`
            : ""}
      </p>
      {nextCursor && (
        <div ref={sentinel}>
          <Button
            variant="secondary"
            loading={loading}
            onClick={() => void load(nextCursor)}
          >
            Load more attendees
          </Button>
        </div>
      )}
    </div>
  );
}
