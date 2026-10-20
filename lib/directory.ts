import type { Schemas } from "./api/client";
export type DirectoryFilters = {
  q: string;
  role: string;
  skill: string[];
  interest: string[];
  goal: string;
};
export function directoryFilters(
  query: Pick<URLSearchParams, "get" | "getAll">,
): DirectoryFilters {
  const tags = (name: string) => [
    ...new Set(
      query
        .getAll(name)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  return {
    q: query.get("q")?.trim() || "",
    role: query.get("role")?.trim() || "",
    skill: tags("skill"),
    interest: tags("interest"),
    goal: query.get("goal")?.trim() || "",
  };
}
export function directoryQuery(filters: DirectoryFilters): URLSearchParams {
  const query = new URLSearchParams();
  for (const name of ["q", "role", "goal"] as const)
    if (filters[name].trim()) query.set(name, filters[name].trim());
  for (const name of ["skill", "interest"] as const)
    for (const value of [
      ...new Set(filters[name].map((tag) => tag.trim()).filter(Boolean)),
    ])
      query.append(name, value);
  return query;
}
export function mergeDirectoryPage(
  existing: Schemas["Profile"][],
  incoming: Schemas["Profile"][],
) {
  const profiles = new Map(
    existing.map((profile) => [profile.attendee_id, profile]),
  );
  for (const profile of incoming) profiles.set(profile.attendee_id, profile);
  return [...profiles.values()];
}
