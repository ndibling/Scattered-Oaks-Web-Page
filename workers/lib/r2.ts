// R2 upload/delete helpers shared by adminAnimals.ts, adminGallery.ts, and
// adminContent.ts's image-field branch. Basic size validation only — SDD's
// client-side pre-resize-before-upload step is explicitly M7, not M6.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function extensionFor(file: File): string {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const fromName = file.name.split('.').pop();
  return fromName && fromName !== file.name ? fromName.toLowerCase() : 'bin';
}

/** Uploads `file` to R2 under `key` and returns the public-serving URL (see routes/media.ts). */
export async function uploadToR2(bucket: R2Bucket, key: string, file: File): Promise<string> {
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return `/media/${key}`;
}

/**
 * No-ops for URLs that aren't R2-backed (e.g. seeded /uploads/... placeholder paths).
 * Moves the object under `trash/` instead of hard-deleting it (SDD §8.6 — R2 objects must be
 * recoverable from accidental deletion); a bucket lifecycle rule expires `trash/` after 30 days.
 */
export async function deleteFromR2(bucket: R2Bucket, url: string): Promise<void> {
  if (!url.startsWith('/media/')) return;
  const key = url.slice('/media/'.length);
  const object = await bucket.get(key);
  if (!object) return;
  await bucket.put(`trash/${key}`, await object.arrayBuffer(), {
    httpMetadata: object.httpMetadata,
  });
  await bucket.delete(key);
}
