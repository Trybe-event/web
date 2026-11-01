import "server-only";

import { notFound, redirect } from "next/navigation";
import { serverApi } from "./api/server";
import { getSession } from "./session";

// Pages also call this before fetching: layouts can render in parallel with them.
export async function requireAdministrator(): Promise<boolean> {
  const session = await getSession();
  if (session.kind === "signed-out" || session.kind === "unconfigured")
    redirect("/admin/sign-in");
  if (session.kind === "unavailable") return false;
  if (session.kind !== "bound" || session.account.type !== "admin") notFound();
  return true;
}

export async function loadReports(cursor?: string) {
  if (!(await requireAdministrator())) return { kind: "unavailable" } as const;
  if (cursor && cursor.length > 2000) notFound();
  try {
    const result = await (
      await serverApi()
    ).GET("/admin/reports", {
      params: { query: cursor ? { cursor } : {} },
      signal: AbortSignal.timeout(8000),
    });
    if (result.response.ok && result.data)
      return { kind: "loaded", queue: result.data } as const;
  } catch {}
  return { kind: "unavailable" } as const;
}

export async function loadReport(reportId: string) {
  if (!(await requireAdministrator())) return { kind: "unavailable" } as const;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reportId))
    notFound();
  try {
    const result = await (
      await serverApi()
    ).GET("/admin/reports/{reportId}", {
      params: { path: { reportId } },
      signal: AbortSignal.timeout(8000),
    });
    if (result.response.ok && result.data)
      return { kind: "loaded", report: result.data } as const;
    if (result.response.status === 404) return { kind: "not_found" } as const;
  } catch {}
  return { kind: "unavailable" } as const;
}
