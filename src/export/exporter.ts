import type { ExportImage, ExportRequest, ExportWorkerOutbound } from "@/export/exportTypes";
import type { Project } from "@/model/types";
import { ASPECT_RATIOS } from "@/model/types";
import { useEditorStore } from "@/state/editorStore";
import { listImageBitmaps } from "@/state/mediaCache";

export type ExportQuality = "proof" | "final";

export interface ExportProgress {
  frame: number;
  totalFrames: number;
}

export interface ExportHandle {
  cancel: () => void;
  done: Promise<Blob>;
}

const QUALITY_PRESETS: Record<ExportQuality, { scale: number; bitrate: number }> = {
  proof: { scale: 0.5, bitrate: 2_500_000 },
  final: { scale: 1, bitrate: 12_000_000 },
};

/** Extracts planar channel data from the decoded audio, trimmed/padded to the project duration. */
function extractAudio(buffer: AudioBuffer | null, duration: number) {
  if (!buffer) return null;
  const sampleRate = buffer.sampleRate;
  const totalSamples = Math.ceil(duration * sampleRate);
  const channelCount = Math.min(2, buffer.numberOfChannels);
  const channels: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) {
    const source = buffer.getChannelData(c);
    const trimmed = new Float32Array(totalSamples);
    trimmed.set(source.subarray(0, Math.min(source.length, totalSamples)));
    channels.push(trimmed);
  }
  return { channels, sampleRate };
}

/**
 * Starts an MP4 export in a worker with an OffscreenCanvas, so encoding
 * keeps running even when the tab is backgrounded.
 */
export async function startExport(
  project: Project,
  quality: ExportQuality,
  onProgress: (progress: ExportProgress) => void,
): Promise<ExportHandle> {
  const editor = useEditorStore.getState();
  const spec = ASPECT_RATIOS[project.aspectRatio];
  const preset = QUALITY_PRESETS[quality];
  // H.264 requires even dimensions.
  const width = Math.round((spec.width * preset.scale) / 2) * 2;
  const height = Math.round((spec.height * preset.scale) / 2) * 2;

  // Clone bitmaps so transferring them does not detach the preview's copies.
  const images: ExportImage[] = [];
  for (const [assetId, bitmap] of listImageBitmaps()) {
    images.push({ assetId, bitmap: await createImageBitmap(bitmap) });
  }

  const audio = extractAudio(editor.audioBuffer, project.duration);

  const worker = new Worker(new URL("./exportWorker.ts", import.meta.url), { type: "module" });

  const request: ExportRequest = {
    type: "start",
    project: JSON.parse(JSON.stringify(project)) as Project,
    analysis: editor.analysis,
    audio,
    images,
    width,
    height,
    fps: project.fps,
    videoBitrate: preset.bitrate,
  };

  const done = new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ExportWorkerOutbound>) => {
      const message = event.data;
      switch (message.type) {
        case "progress":
          onProgress({ frame: message.frame, totalFrames: message.totalFrames });
          break;
        case "done":
          worker.terminate();
          resolve(new Blob([message.buffer], { type: "video/mp4" }));
          break;
        case "error":
          worker.terminate();
          reject(new Error(message.message));
          break;
        case "cancelled":
          worker.terminate();
          reject(new ExportCancelledError());
          break;
        default: {
          const exhaustive: never = message;
          throw new Error(`Unhandled export message: ${String(exhaustive)}`);
        }
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Export worker crashed."));
    };
  });

  const transfers: Transferable[] = images.map((i) => i.bitmap);
  if (audio) transfers.push(...audio.channels.map((c) => c.buffer));
  worker.postMessage(request, transfers);

  return {
    cancel: () => worker.postMessage({ type: "cancel" }),
    done,
  };
}

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "ExportCancelledError";
  }
}

export function exportFileBaseName(project: Project): string {
  const rawName = project.songName.trim() || project.name;
  const safeName = rawName.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return safeName || "beat_visualizer";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
