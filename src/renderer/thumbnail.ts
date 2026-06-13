import type { AudioAnalysis } from "@/audio/analysisTypes";
import { createFeatureSampler } from "@/audio/features";
import type { Project } from "@/model/types";
import { ASPECT_RATIOS } from "@/model/types";
import { RenderEngine } from "@/renderer/engine";
import { listImageBitmaps } from "@/state/mediaCache";
import { saveThumbnail } from "@/storage/db";

const THUMBNAIL_WIDTH = 480;
/** Short fixed-step run-up so trails look representative in the still. */
const WARMUP_FRAMES = 8;

/**
 * Renders the project thumbnail: a deterministic frame at 25% of the
 * timeline (see "Project thumbnail" in CONTEXT.md). Uses its own small
 * OffscreenCanvas engine so the visible preview is untouched.
 */
export async function renderProjectThumbnail(
  project: Project,
  analysis: AudioAnalysis | null,
): Promise<Blob | null> {
  const spec = ASPECT_RATIOS[project.aspectRatio];
  const width = THUMBNAIL_WIDTH;
  const height = Math.round(((width * spec.height) / spec.width) / 2) * 2;
  const canvas = new OffscreenCanvas(width, height);

  let engine: RenderEngine | null = null;
  try {
    engine = new RenderEngine(canvas, width, height);
    for (const [assetId, bitmap] of listImageBitmaps()) {
      engine.setImage(assetId, bitmap);
    }

    const features = createFeatureSampler(analysis, project.beatGrid);
    const time = project.duration * 0.25;
    const step = 1 / project.fps;
    for (let k = WARMUP_FRAMES; k >= 0; k--) {
      engine.renderFrame({ project, time: Math.max(0, time - k * step), features });
    }

    return await canvas.convertToBlob({ type: "image/png" });
  } catch {
    return null; // Thumbnails are best-effort; never break editing over one.
  } finally {
    engine?.dispose();
  }
}

export async function generateAndStoreThumbnail(
  project: Project,
  analysis: AudioAnalysis | null,
): Promise<void> {
  const blob = await renderProjectThumbnail(project, analysis);
  if (blob) {
    await saveThumbnail(project.id, blob);
  }
}
