import { registerAacEncoder } from "@mediabunny/aac-encoder";
import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  canEncodeAudio,
  CanvasSource,
  Mp4OutputFormat,
  Output,
} from "mediabunny";
import { createFeatureSampler } from "@/audio/features";
import type { ExportWorkerInbound, ExportWorkerOutbound } from "@/export/exportTypes";
import { RenderEngine } from "@/renderer/engine";
import { totalFramesForDuration } from "@/timeline/time";

let cancelled = false;

function post(message: ExportWorkerOutbound, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

self.onmessage = (event: MessageEvent<ExportWorkerInbound>) => {
  if (event.data.type === "cancel") {
    cancelled = true;
    return;
  }
  cancelled = false;
  void runExport(event.data).catch((error: unknown) => {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  });
};

async function runExport(request: Extract<ExportWorkerInbound, { type: "start" }>): Promise<void> {
  const { project, analysis, audio, images, width, height, fps, videoBitrate } = request;

  const canvas = new OffscreenCanvas(width, height);
  const engine = new RenderEngine(canvas, width, height);
  for (const image of images) {
    engine.setImage(image.assetId, image.bitmap);
  }

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: videoBitrate,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource: AudioSampleSource | null = null;
  if (audio) {
    if (!(await canEncodeAudio("aac"))) {
      registerAacEncoder();
    }
    audioSource = new AudioSampleSource({ codec: "aac", bitrate: 192_000 });
    output.addAudioTrack(audioSource);
  }

  await output.start();

  const features = createFeatureSampler(analysis, project.beatGrid);
  const totalFrames = totalFramesForDuration(project.duration, fps);

  // Deterministic fixed-step rendering: frame i is always rendered at time
  // i/fps with trail state accumulated from frame 0.
  engine.resetTemporalState();
  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelled) {
      await output.cancel();
      engine.dispose();
      post({ type: "cancelled" });
      return;
    }
    const time = frame / fps;
    engine.renderFrame({ project, time, features });
    await videoSource.add(time, 1 / fps);
    if (frame % 15 === 0) {
      post({ type: "progress", frame, totalFrames });
    }
  }

  if (audioSource && audio) {
    // Interleave planar channels into f32 frames and feed in ~1s chunks.
    const { channels, sampleRate } = audio;
    const channelCount = channels.length;
    const totalSamples = Math.min(
      channels[0].length,
      Math.ceil(project.duration * sampleRate),
    );
    const chunkFrames = sampleRate;
    for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
      if (cancelled) {
        await output.cancel();
        engine.dispose();
        post({ type: "cancelled" });
        return;
      }
      const frames = Math.min(chunkFrames, totalSamples - offset);
      const interleaved = new Float32Array(frames * channelCount);
      for (let c = 0; c < channelCount; c++) {
        const data = channels[c];
        for (let i = 0; i < frames; i++) {
          interleaved[i * channelCount + c] = data[offset + i];
        }
      }
      const sample = new AudioSample({
        data: interleaved,
        format: "f32",
        numberOfChannels: channelCount,
        sampleRate,
        timestamp: offset / sampleRate,
      });
      await audioSource.add(sample);
      sample.close();
    }
  }

  await output.finalize();
  engine.dispose();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) {
    post({ type: "error", message: "Export produced no data." });
    return;
  }
  post({ type: "done", buffer }, [buffer]);
}
