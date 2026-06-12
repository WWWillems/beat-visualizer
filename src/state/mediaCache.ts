/**
 * Runtime cache for binary media. Blobs and decoded objects are not part of
 * the undoable project document; they are keyed by asset id and persisted
 * separately in IndexedDB.
 */
const blobs = new Map<string, Blob>();
const imageBitmaps = new Map<string, ImageBitmap>();

export function putBlob(assetId: string, blob: Blob): void {
  blobs.set(assetId, blob);
}

export function getBlob(assetId: string): Blob | undefined {
  return blobs.get(assetId);
}

export function putImageBitmap(assetId: string, bitmap: ImageBitmap): void {
  imageBitmaps.get(assetId)?.close();
  imageBitmaps.set(assetId, bitmap);
}

export function getImageBitmap(assetId: string): ImageBitmap | undefined {
  return imageBitmaps.get(assetId);
}

export function listImageBitmaps(): ReadonlyMap<string, ImageBitmap> {
  return imageBitmaps;
}

export function clearMediaCache(): void {
  blobs.clear();
  for (const bitmap of imageBitmaps.values()) bitmap.close();
  imageBitmaps.clear();
}
