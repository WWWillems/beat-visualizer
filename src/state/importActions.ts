import { analyzeInWorker, AudioImportError, decodeAudioFile } from "@/audio/importAudio";
import { transport } from "@/audio/playback";
import { createId, createVisualClip } from "@/model/defaults";
import type { AudioClip, ImageClip, Project } from "@/model/types";
import { useEditorStore } from "@/state/editorStore";
import { putBlob, putImageBitmap } from "@/state/mediaCache";
import { useProjectStore } from "@/state/projectStore";
import { saveAssetBlob } from "@/storage/db";
import { fitClipsToDuration } from "@/timeline/clips";

export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024;

function firstTrackOfType(project: Project, type: "audio" | "visual" | "image") {
  return project.tracks.find((t) => t.type === type);
}

/**
 * Imports the primary audio file: decodes on the main thread, analyzes in a
 * worker, then updates the project (asset, clip, duration, beat grid) and the
 * playback transport.
 */
export async function importAudioFile(file: File): Promise<void> {
  const editor = useEditorStore.getState();
  const store = useProjectStore.getState();

  editor.setAnalysisPending(true);
  try {
    const buffer = await decodeAudioFile(file);
    const analysis = await analyzeInWorker(buffer);

    const assetId = createId();
    putBlob(assetId, file);
    void saveAssetBlob(assetId, file);

    const clip: AudioClip = {
      id: createId(),
      type: "audio",
      assetId,
      start: 0,
      duration: buffer.duration,
      sourceOffset: 0,
      gain: 1,
    };

    store.updateProject((project) => {
      project.assets.push({
        id: assetId,
        kind: "audio",
        name: file.name,
        mimeType: file.type || "audio/mpeg",
        duration: buffer.duration,
      });
      project.primaryAudioAssetId = assetId;
      // Timeline duration matches the audio exactly; it caps playback,
      // clip drag/resize bounds, and export length.
      project.duration = buffer.duration;
      fitClipsToDuration(project.tracks, buffer.duration, 1 / project.fps);
      project.beatGrid = { bpm: analysis.bpm, offset: analysis.beatOffset };
      const track = firstTrackOfType(project, "audio");
      if (track && track.type === "audio") {
        track.clips = [clip];
      }
    });

    transport.setBuffer(buffer);
    useEditorStore.getState().setAudio(buffer);
    useEditorStore.getState().setAnalysis(analysis);
  } finally {
    useEditorStore.getState().setAnalysisPending(false);
  }
}

/** Imports an image and places a clip spanning the whole timeline. */
export async function importImageFile(file: File): Promise<void> {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new AudioImportError(
      `Image is ${(file.size / 1024 / 1024).toFixed(0)} MB; the limit is ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }
  const bitmap = await createImageBitmap(file);
  const assetId = createId();
  putBlob(assetId, file);
  putImageBitmap(assetId, bitmap);
  void saveAssetBlob(assetId, file);

  const store = useProjectStore.getState();
  const clip: ImageClip = {
    id: createId(),
    type: "image",
    assetId,
    start: 0,
    duration: store.project.duration,
    fit: "contain",
    opacity: 1,
    layout: { offsetX: 0, offsetY: 0, scale: 1 },
    layoutOverrides: {},
  };

  store.updateProject((project) => {
    project.assets.push({
      id: assetId,
      kind: "image",
      name: file.name,
      mimeType: file.type || "image/png",
      width: bitmap.width,
      height: bitmap.height,
    });
    const track = firstTrackOfType(project, "image");
    if (track && track.type === "image") {
      track.clips.push(clip);
    }
  });
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  return /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

/**
 * Routes a file (from drag-and-drop or a picker) to the right importer.
 * Throws AudioImportError for unsupported types.
 */
export async function importMediaFile(file: File): Promise<void> {
  if (isAudioFile(file)) {
    await importAudioFile(file);
  } else if (isImageFile(file)) {
    await importImageFile(file);
  } else {
    throw new AudioImportError(
      `"${file.name}" is not a supported file. Use MP3, WAV, PNG, or JPG.`,
    );
  }
}

/** Adds a default Look clip to the first visual track at the given time. */
export function addVisualClipAt(start: number, duration: number): void {
  const store = useProjectStore.getState();
  const track = firstTrackOfType(store.project, "visual");
  if (!track) return;
  const clip = createVisualClip(start, duration);
  store.addClip(track.id, clip);
  useEditorStore.getState().selectClip(track.id, clip.id);
}
