"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Alert, Button, Card, Input, Select } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import {
  checkedInOn,
  checkInDays,
  checkInsCsv,
  eventToday,
  shouldSend,
  passCode,
  searchByName,
  type CheckInRow,
} from "@/lib/check-in";
import { createQrReader, hasCamera } from "@/lib/qr-reader";

type Registration = Schemas["OrganizerRegistration"];
type Outcome = { tone: "success" | "danger"; text: string };

// What to tell the organizer when the camera does not start, by the browser's reason.
export function cameraFailure(
  error: unknown,
  pageAllowsCamera = pageMayUseCamera(),
) {
  if (!pageAllowsCamera)
    return "This page was opened before the camera was allowed here. Reload the page, then try again.";
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access is blocked for this site. Click the camera icon in the address bar, allow it, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera was found on this device. Use a handheld scanner or type the code below.";
  if (name === "NotReadableError")
    return "The camera is in use by another app. Close it, then try again.";
  return "The camera could not start. Use a handheld scanner or type the code below.";
}

function pageMayUseCamera() {
  const policy =
    (
      document as Document & {
        permissionsPolicy?: { allowsFeature(feature: string): boolean };
        featurePolicy?: { allowsFeature(feature: string): boolean };
      }
    ).permissionsPolicy ??
    (
      document as Document & {
        featurePolicy?: { allowsFeature(feature: string): boolean };
      }
    ).featurePolicy;
  return policy ? policy.allowsFeature("camera") : true;
}

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
  // Today comes from the server (the event's time zone, the day check-ins are recorded
  // against); the device clock is only a fallback until the first answer arrives.
  const [serverToday, setServerToday] = useState<string | null>(null);
  const [mode, setMode] = useState<"daily" | "once">("daily");
  const [viewDay, setViewDay] = useState<string | null>(null);
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
  const today = serverToday ?? eventToday(timezone);
  const shownDay = viewDay ?? today;

  const reload = useCallback(async () => {
    const { data } = await api.GET("/organizer/events/{eventId}/check-ins", {
      params: { path: { eventId } },
    });
    if (data) {
      setRows(data.items as CheckInRow[]);
      if (data.today) setServerToday(data.today);
      if (data.mode) setMode(data.mode);
    }
  }, [eventId]);

  useEffect(() => {
    api
      .GET("/organizer/events/{eventId}/check-ins", {
        params: { path: { eventId } },
      })
      .then(({ data }) => {
        if (!data) return;
        setRows(data.items as CheckInRow[]);
        if (data.today) setServerToday(data.today);
        if (data.mode) setMode(data.mode);
      })
      .catch(() => {});
  }, [eventId]);

  const checkIn = useCallback(
    // Resolves true once Trybe answered (checked in, already in, or refused), false
    // when it could not be reached, so the camera knows whether to try again.
    async (
      body: { code: string } | { registration_id: string },
    ): Promise<boolean> => {
      if (sending.current) return false;
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
          return true;
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
        return true;
      } catch {
        setOutcome({
          tone: "danger",
          text: "Could not reach Trybe. Try again.",
        });
        return false;
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
    let retry = false;
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
          // A pass held in front of the camera is sent once. The same pass is sent
          // again only if Trybe could not be reached, after a pause; otherwise a
          // second read would replace "is checked in" with "already checked in".
          if (shouldSend(found, last, retry, Date.now() - lastAt)) {
            last = found!;
            lastAt = Date.now();
            retry = !(await checkIn({ code: passCode(found!) }));
          }
        }, 300);
      } catch (error) {
        setCameraError(cameraFailure(error));
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera, checkIn]);

  // Daily: who is in today. Once: anyone checked in on any day counts.
  const inToday =
    mode === "once"
      ? new Set(rows.map((row) => row.registration_id))
      : checkedInOn(rows, today);
  const days = checkInDays(rows, today);
  const shown =
    mode === "once" ? rows : rows.filter((row) => row.event_day === shownDay);
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
              {mode === "once"
                ? `${inToday.size} of ${admitted.length} admitted checked in (once for the whole event).`
                : `${inToday.size} of ${admitted.length} admitted checked in today (${today}).`}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {mode === "once"
              ? `Checked in (${shown.length})`
              : shownDay === today
                ? `Checked in today (${shown.length})`
                : `Checked in on ${shownDay} (${shown.length})`}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={!rows.length}
            onClick={download}
          >
            Download CSV
          </Button>
        </div>
        {mode === "daily" && days.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            Day
            <Select
              value={shownDay}
              onChange={(event) =>
                setViewDay(
                  event.target.value === today ? null : event.target.value,
                )
              }
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d === today ? `Today (${d})` : d}
                </option>
              ))}
            </Select>
          </label>
        )}
        <ul className="divide-y divide-line text-sm">
          {shown.slice(0, 50).map((row) => (
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
          {!shown.length && (
            <li className="py-2 text-muted">
              {mode === "daily" && shownDay === today
                ? "No one has checked in yet today."
                : "No check-ins yet."}
            </li>
          )}
        </ul>
        {shown.length > 50 && (
          <p className="text-xs text-muted">
            Showing the latest 50. The CSV has every day and everyone.
          </p>
        )}
      </Card>
    </div>
  );
}
