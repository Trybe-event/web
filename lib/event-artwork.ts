export const ARTWORK_FORMATS = {
  post: { label: "Post (4:5)", width: 1080, height: 1350 },
  square: { label: "Square (1:1)", width: 1080, height: 1080 },
  story: { label: "Story (9:16)", width: 1080, height: 1920 },
  og: { label: "Link preview", width: 1200, height: 630 },
} as const;

export const ARTWORK_THEMES = {
  forest: { label: "Forest", from: "#36533a", to: "#11251e" },
  plum: { label: "Plum", from: "#655075", to: "#241b38" },
  ocean: { label: "Ocean", from: "#345f74", to: "#162a40" },
  amber: { label: "Amber", from: "#795e39", to: "#302320" },
} as const;

export type ArtworkFormat = keyof typeof ARTWORK_FORMATS;
export type ArtworkTheme = keyof typeof ARTWORK_THEMES;

export function artworkPath(
  slug: string,
  format: ArtworkFormat = "og",
  theme: ArtworkTheme = "forest",
) {
  return `/event-artwork/${encodeURIComponent(slug)}?format=${format}&theme=${theme}`;
}

export function eventShareLinks(url: string, name: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${name}\n${url}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`,
  };
}
