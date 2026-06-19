import type { AudioAnalysis } from "@/audio/analysisTypes";
import {
  createFeatureSampler,
  createSpectralSampler,
  SPECTRAL_BIN_COUNT,
  type SpectralSampler,
} from "@/audio/features";
import type { FeatureSampler } from "@/model/evaluate";
import type { Project } from "@/model/types";
import { ASPECT_RATIOS, SCHEMA_VERSION } from "@/model/types";
import { RenderEngine } from "@/renderer/engine";
import type { LookDescriptor } from "@/renderer/presets";
import { LOOK_HERO_FEATURES } from "@/renderer/renderDynamics";
import { listImageBitmaps } from "@/state/mediaCache";
import { saveThumbnail } from "@/storage/db";

const THUMBNAIL_WIDTH = 480;
const LOOK_THUMBNAIL_SIZE = 192;
const LOOK_THUMBNAIL_TIME = 1.8;
/** Short fixed-step run-up so trails look representative in the still. */
const WARMUP_FRAMES = 8;

const syntheticLookFeatures: FeatureSampler = (source, time) => {
  const shimmer = 0.96 + 0.04 * Math.sin(time * 2.1);
  return Math.min(1, LOOK_HERO_FEATURES[source] * shimmer);
};

const syntheticLookSpectrum: SpectralSampler = (time, target = new Float32Array(SPECTRAL_BIN_COUNT)) => {
  for (let i = 0; i < SPECTRAL_BIN_COUNT; i++) {
    const x = i / Math.max(1, SPECTRAL_BIN_COUNT - 1);
    const bassPeak = Math.exp(-((x - 0.16) ** 2) / 0.012);
    const midPeak = Math.exp(-((x - 0.48) ** 2) / 0.035);
    const highRipple = 0.5 + 0.5 * Math.sin(i * 0.72 + time * 4.1);
    target[i] = Math.min(1, bassPeak * 0.78 + midPeak * 0.62 + highRipple * x * 0.34);
  }
  return target;
};

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
    const spectrum = createSpectralSampler(analysis);
    const time = project.duration * 0.25;
    const step = 1 / project.fps;
    for (let k = WARMUP_FRAMES; k >= 0; k--) {
      engine.renderFrame({ project, time: Math.max(0, time - k * step), features, spectrum });
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

function projectForLook(look: LookDescriptor): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `look-thumbnail-${look.id}`,
    name: look.label,
    songName: "",
    createdAt: 0,
    modifiedAt: 0,
    duration: 4,
    fps: 30,
    aspectRatio: "1:1",
    tracks: [
      {
        id: "visual",
        type: "visual",
        name: "Visual",
        muted: false,
        opacity: 1,
        blendMode: "normal",
        clips: [
          {
            id: "look",
            type: "visual",
            presetId: look.presetId,
            lookId: look.id,
            start: 0,
            duration: 4,
            seed: look.seed,
            params: { ...look.params },
            keyframes: {},
            modulations: look.defaultModulations.map((modulation, index) => ({
              id: `mod-${index}`,
              ...modulation,
            })),
          },
        ],
      },
    ],
    assets: [],
    beatGrid: null,
    primaryAudioAssetId: null,
  };
}

export async function renderLookThumbnail(look: LookDescriptor): Promise<Blob | null> {
  const canvas = new OffscreenCanvas(LOOK_THUMBNAIL_SIZE, LOOK_THUMBNAIL_SIZE);
  let engine: RenderEngine | null = null;
  try {
    engine = new RenderEngine(canvas, LOOK_THUMBNAIL_SIZE, LOOK_THUMBNAIL_SIZE);
    const project = projectForLook(look);
    const step = 1 / project.fps;
    for (let k = WARMUP_FRAMES; k >= 0; k--) {
      engine.renderFrame({
        project,
        time: Math.max(0, LOOK_THUMBNAIL_TIME - k * step),
        features: syntheticLookFeatures,
        spectrum: syntheticLookSpectrum,
      });
    }
    return await canvas.convertToBlob({ type: "image/png" });
  } catch {
    return null;
  } finally {
    engine?.dispose();
  }
}
