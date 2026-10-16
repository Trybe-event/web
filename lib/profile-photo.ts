export const MAX_PROFILE_PHOTO_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_PROFILE_PHOTO_UPLOAD_BYTES = 200 * 1024;
export const PROFILE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Re-encoding removes camera metadata and keeps only avatar-sized pixels. */
export async function optimizeProfilePhoto(source: File): Promise<File> {
  if (
    !PROFILE_PHOTO_TYPES.includes(
      source.type as (typeof PROFILE_PHOTO_TYPES)[number],
    )
  ) {
    throw new Error(
      "Choose a JPEG, PNG or WebP image. Export HEIC photos as JPEG first.",
    );
  }
  if (!source.size || source.size > MAX_PROFILE_PHOTO_SOURCE_BYTES) {
    throw new Error("Choose a photo up to 20 MB.");
  }
  const sourceUrl = URL.createObjectURL(source);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "This photo could not be opened. Try a JPEG, PNG or WebP image.",
          ),
        );
      image.src = sourceUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("This photo has no readable image dimensions.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Photo optimization isn't available in this browser.");
    for (const maximumEdge of [768, 640, 512, 384, 256]) {
      const scale = Math.min(
        1,
        maximumEdge / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.74, 0.62]) {
        const optimized = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (
          optimized &&
          optimized.size > 0 &&
          optimized.size <= MAX_PROFILE_PHOTO_UPLOAD_BYTES
        ) {
          return new File([optimized], "profile-photo.jpg", {
            type: "image/jpeg",
          });
        }
      }
    }
    throw new Error(
      "We couldn't reduce this photo enough. Please choose another image.",
    );
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(sourceUrl);
  }
}
