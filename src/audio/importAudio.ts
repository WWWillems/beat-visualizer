import type { AnalysisRequest, AnalysisResponse, AudioAnalysis } from "@/audio/analysisTypes";

export const MAX_AUDIO_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 15 * 60;

export class AudioImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioImportError";
  }
}

/**
 * Decodes an MP3/WAV file on the main thread (decodeAudioData is unavailable
 * in workers); analysis of the decoded samples runs in the worker.
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    throw new AudioImportError(
      `File is ${(file.size / 1024 / 1024).toFixed(0)} MB; the limit is ${MAX_AUDIO_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(arrayBuffer);
    if (buffer.duration > MAX_AUDIO_DURATION_SECONDS) {
      throw new AudioImportError(
        `Audio is ${Math.round(buffer.duration / 60)} minutes long; the limit is ${MAX_AUDIO_DURATION_SECONDS / 60} minutes.`,
      );
    }
    return buffer;
  } catch (error) {
    if (error instanceof AudioImportError) throw error;
    throw new AudioImportError("Could not decode this file. Use an MP3 or WAV file.");
  } finally {
    void context.close();
  }
}

/** Mixes all channels down to mono for analysis. */
export function monoMixdown(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i];
    }
  }
  if (buffer.numberOfChannels > 1) {
    for (let i = 0; i < length; i++) {
      mono[i] /= buffer.numberOfChannels;
    }
  }
  return mono;
}

/** Runs offline analysis in a dedicated worker. */
export function analyzeInWorker(buffer: AudioBuffer): Promise<AudioAnalysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysisWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<AnalysisResponse>) => {
      worker.terminate();
      if (event.data.ok) {
        resolve(event.data.analysis);
      } else {
        reject(new AudioImportError(event.data.error));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new AudioImportError(event.message || "Audio analysis failed."));
    };

    const mono = monoMixdown(buffer);
    const request: AnalysisRequest = { channelData: mono, sampleRate: buffer.sampleRate };
    worker.postMessage(request, [mono.buffer]);
  });
}
