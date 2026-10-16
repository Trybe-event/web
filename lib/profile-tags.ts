export const maximumProfileTags = 20;
export const maximumProfileTagLength = 40;

export function addProfileTags(existing: string[], incoming: string[]) {
  const tags = [...existing];
  const known = new Set(tags.map((tag) => tag.toLowerCase()));
  for (const value of incoming) {
    const tag = value.trim();
    if (!tag || known.has(tag.toLowerCase())) continue;
    if (Array.from(tag).length > maximumProfileTagLength)
      return {
        tags: existing,
        error: "Each tag must be 40 characters or fewer.",
      };
    if (tags.length >= maximumProfileTags)
      return { tags: existing, error: "Add up to 20 tags." };
    known.add(tag.toLowerCase());
    tags.push(tag);
  }
  return { tags, error: undefined };
}
