// [ADDED] 2026-07-22 (M7). Client-side pre-resize before upload (Requirements
// §7.1/§8.2: "images are resized/compressed on upload"). No target dimension
// or quality is specified anywhere in the docs — 2000px longest edge and
// JPEG @0.85 are a deliberate choice: generous for any layout on this site,
// while cutting typical 10-20MB phone photos drastically. Re-encodes to JPEG
// for most inputs, EXCEPT PNG stays PNG — one of the three admin image
// upload slots (site.logo_url, ContentEditor.tsx) is routinely a
// transparent-background logo, and flattening transparency to an opaque
// JPEG background would visibly break it against the footer's dark
// background. PNG re-encode is still lossless-recompressed at the smaller
// dimension, just without the extra JPEG size win. GIFs pass through
// unresized — canvas re-encoding would flatten animation to a single frame.
// Video is out of scope (every requirement mentioning resize says "images"
// specifically) and is a no-op here since `file.type` won't start with
// "image/".
export const MAX_DIMENSION = 2000;
export const JPEG_QUALITY = 0.85;

export function computeResizedDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/* istanbul ignore next -- requires real browser canvas/createImageBitmap
 * APIs; this repo has no jsdom/DOM test harness for src/**\/*.tsx or
 * DOM-dependent src/lib files. Verified instead via
 * e2e/admin-flow.spec.ts's large-image upload + natural-width assertion. */
export async function resizeImageFile(
  file: File,
  maxDimension: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = computeResizedDimensions(bitmap.width, bitmap.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? quality : undefined),
  );
  if (!blob) return file;

  const extension = outputType === 'image/png' ? 'png' : 'jpg';
  const newName = file.name.replace(/\.[^./]+$/, '') + '.' + extension;
  return new File([blob], newName, { type: outputType });
}
