"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Alert, Button, Card, Input } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import {
  checkedInOn,
  checkInsCsv,
  eventToday,
  passCode,
  searchByName,
  type CheckInRow,
} from "@/lib/check-in";
import { createQrReader, hasCamera } from "@/lib/qr-reader";

type Registration = Schemas["OrganizerRegistration"];
type Outcome = { tone: "success" | "danger"; text: string };

export function CheckInDesk({
  eventId,
  timezone,
  registrations,
}: {
  eventId: string;
  timezone: string;
  registrations: Registration[];
}) {
  const [rows, setRows] = useState<CheckInRow[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  // Any device with a camera can scan; the handheld-scanner field and the name
  // search work everywhere.
  const canScan = useSyncExternalStore(
    () => () => {},
    hasCamera,
    () => false,
  );
  const video = useRef<HTMLVideoElement>(null);
  const sending = useRef(false);
  const today = eventToday(timezone);

  const reload = useCallback(async () => {
    const { data } = await api.GET("/organizer/events/{eventId}/check-ins", {
      params: { path: { eventId } },
    });
    if (data) setRows(data.items as CheckInRow[]);
  }, [eventId]);

  useEffect(() => {
    api
      .GET("/organizer/events/{eventId}/check-ins", {
        params: { path: { eventId } },
      })
      .then(({ data }) => data && setRows(data.items as CheckInRow[]))
      .catch(() => {});
  }, [eventId]);

  const checkIn = useCallback(
    async (body: { code: string } | { registration_id: string }) => {
      if (sending.current) return;
      sending.current = true;
      setBusy(true);
      try {
        const { data, error } = await api.POST(
          "/organizer/events/{eventId}/check-ins",
          {
            params: { path: { eventId } },
            body,
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!data) {
          setOutcome({ tone: "danger", text: errorMessage(error) });
          return;
        }
        setOutcome(
          data.result === "checked_in"
            ? { tone: "success", text: `${data.attendee_name} is checked in.` }
            : {
                tone: "danger",
                text: `${data.attendee_name} already checked in today at ${new Date(data.checked_in_at).toLocaleTimeString()}.`,
              },
        );
        await reload();
      } catch {
        setOutcome({
          tone: "danger",
          text: "Could not reach Trybe. Try again.",
        });
      } finally {
        sending.current = false;
        setBusy(false);
      }
    },
    [eventId, reload],
  );

  // Camera scanning: read a frame a few times a second until a code is found.
  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let last = "";
    let lastAt = 0;
    let stopped = false;
    (async () => {
      try {
        const read = await createQrReader();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        timer = setInterval(async () => {
          if (!video.current || sending.current) return;
          const found = await read(video.current).catch(() => null);
          // A pass held in front of the camera is sent once; the same pass is read
          // again only after a pause, so a failed attempt can be retried.
          if (found && (found !== last || Date.now() - lastAt > 4000)) {
            last = found;
            lastAt = Date.now();
            void checkIn({ code: passCode(found) });
          }
        }, 300);
      } catch {
        setCameraError(
          "The camera could not start. Allow camera access, or use the field below.",
        );
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera, checkIn]);

  const inToday = checkedInOn(rows, today);
  const admitted = registrations.filter((r) => r.status === "active");
  const query = search.trim();
  const { items: matches, total: matchCount } = searchByName(admitted, query);

  function download() {
    const blob = new Blob([checkInsCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `check-ins-${eventId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Check people in</h2>
            <p className="text-sm text-muted">
              {inToday.size} of {admitted.length} admitted checked in today (
              {today}).
            </p>
          </div>
          {canScan && (
            <Button variant="secondary" onClick={() => setCamera((on) => !on)}>
              {camera ? "Stop camera" : "Scan with camera"}
            </Button>
          )}
        </div>
        {camera && (
          <video
            ref={video}
            className="w-full max-w-sm rounded-lg"
            muted
            playsInline
          />
        )}
        {cameraError && <Alert>{cameraError}</Alert>}
        <p className="text-sm text-muted">
          Using a handheld barcode scanner? Keep the cursor in this box: each
          scan types the pass code and checks the person in.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = passCode(code);
            if (!value) return;
            setCode("");
            void checkIn({ code: value });
          }}
        >
          <Input
            aria-label="Pass code"
            placeholder="Scan with a handheld scanner, or type the pass code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" disabled={busy}>
            Check in
          </Button>
        </form>
        <div aria-live="polite">
          {outcome && <Alert tone={outcome.tone}>{outcome.text}</Alert>}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-bold">Find by name</h2>
        <p className="text-sm text-muted">
          For people without their phone or pass.
        </p>
        <Input
          aria-label="Search admitted attendees"
          placeholder="First name or surname"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="divide-y divide-line">
          {matches.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span>{r.attendee_name}</span>
              {inToday.has(r.id) ? (
                <span className="text-sm text-muted">Checked in</span>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void checkIn({ registration_id: r.id })}
                >
                  Check in
                </Button>
              )}
            </li>
          ))}
          {query && !matches.length && (
            <li className="py-2 text-sm text-muted">
              No admitted attendee matches.
            </li>
          )}
        </ul>
        {matchCount > matches.length && (
          <p className="text-sm text-muted">
            Showing {matches.length} of {matchCount}. Type more of the name to
            narrow it down.
          </p>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Checked in ({rows.length})</h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={!rows.length}
            onClick={download}
          >
            Download CSV
          </Button>
        </div>
        <ul className="divide-y divide-line text-sm">
          {rows.slice(0, 50).map((row) => (
            <li
              key={`${row.registration_id}-${row.event_day}`}
              className="flex justify-between gap-3 py-2"
            >
              <span>{row.attendee_name}</span>
              <span className="text-muted">
                {row.event_day},{" "}
                {new Date(row.checked_in_at).toLocaleTimeString()} ({row.method}
                )
              </span>
            </li>
          ))}
        </ul>
        {rows.length > 50 && (
          <p className="text-xs text-muted">
            Showing the latest 50. The CSV has everyone.
          </p>
        )}
      </Card>
    </div>
  );
}
