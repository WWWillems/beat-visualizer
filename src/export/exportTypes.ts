import type { AudioAnalysis } from "@/audio/analysisTypes";
import type { Project } from "@/model/types";

export interface ExportAudioData {
  /** Planar channel data trimmed to the export duration. */
  channels: Float32Array[];
  sampleRate: number;
}

export interface ExportImage {
  assetId: string;
  bitmap: ImageBitmap;
}

export interface ExportRequest {
  type: "start";
  project: Project;
  analysis: AudioAnalysis | null;
  audio: ExportAudioData | null;
  images: ExportImage[];
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
}

export interface ExportCancel {
  type: "cancel";
}

export type ExportWorkerInbound = ExportRequest | ExportCancel;

export type ExportWorkerOutbound =
  | { type: "progress"; frame: number; totalFrames: number }
  | { type: "done"; buffer: ArrayBuffer }
  | { type: "error"; message: string }
  | { type: "cancelled" };
