import * as THREE from "three";
import type { SpectralSampler } from "@/audio/features";
import type { FeatureSampler } from "@/model/evaluate";
import type {
  AspectRatioId,
  BlendMode,
  ImageClip,
  Project,
  Track,
  VisualClip,
} from "@/model/types";
import { ASPECT_RATIOS } from "@/model/types";
import { createPresetInstance, type VisualPresetInstance } from "@/renderer/presetRegistry";

export interface RenderFrameInput {
  project: Project;
  /** Absolute timeline time, seconds. */
  time: number;
  features: FeatureSampler;
  spectrum: SpectralSampler;
}

function applyBlendMode(material: THREE.MeshBasicMaterial, mode: BlendMode): void {
  switch (mode) {
    case "normal":
      material.blending = THREE.NormalBlending;
      break;
    case "add":
      material.blending = THREE.AdditiveBlending;
      break;
    case "screen":
      material.blending = THREE.CustomBlending;
      material.blendSrc = THREE.OneMinusDstColorFactor;
      material.blendDst = THREE.OneFactor;
      break;
    case "multiply":
      material.blending = THREE.MultiplyBlending;
      break;
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unhandled blend mode: ${String(exhaustive)}`);
    }
  }
}

/**
 * Shared deterministic render engine used by both the live preview and the
 * export worker. Works against any WebGL-capable canvas, including
 * OffscreenCanvas. Rendering a frame is a pure function of (project, time)
 * except for trail accumulation, which is reset on seeks.
 */
export class RenderEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly compositeScene = new THREE.Scene();
  private readonly compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  private readonly layerMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly visualInstances = new Map<
    string,
    { presetId: VisualClip["presetId"]; seed: number; instance: VisualPresetInstance }
  >();
  private readonly imageTextures = new Map<string, THREE.Texture>();
  private width: number;
  private height: number;
  private lastTime: number | null = null;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    for (const entry of this.visualInstances.values()) {
      entry.instance.setSize(width, height);
    }
  }

  /** Registers a decoded image for an image asset. */
  setImage(assetId: string, bitmap: ImageBitmap): void {
    this.imageTextures.get(assetId)?.dispose();
    const texture = new THREE.Texture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.imageTextures.set(assetId, texture);
  }

  /**
   * Renders one frame. Layers composite bottom-to-top following project
   * track order; timeline gaps stay black.
   */
  renderFrame(input: RenderFrameInput): void {
    const { project, time, features, spectrum } = input;

    // A backwards jump means a seek: reset trails so the output for time t
    // doesn't depend on what was previously on screen. An unchanged time
    // (paused playhead) must not re-accumulate trail energy.
    const isSeek = this.lastTime !== null && time < this.lastTime - 1e-4;
    const isPaused = this.lastTime !== null && !isSeek && time - this.lastTime < 1e-4;
    const dt =
      this.lastTime === null || isSeek || isPaused
        ? 1 / project.fps
        : Math.max(1e-4, time - this.lastTime);
    this.lastTime = time;

    // Pass 1: render every active visual clip into its own trail buffer.
    const activeLayers: { texture: THREE.Texture; opacity: number; blendMode: BlendMode; fitAssetId?: string }[] = [];

    for (const track of project.tracks) {
      if (track.muted) continue;
      const layer = this.renderTrackLayer(track, time, dt, features, spectrum, isSeek, isPaused, project);
      if (layer) activeLayers.push(layer);
    }

    this.releaseStaleInstances(project, time);

    // Pass 2: composite layers onto the canvas.
    this.syncLayerMeshes(activeLayers.length);
    for (let i = 0; i < activeLayers.length; i++) {
      const mesh = this.layerMeshes[i];
      const layer = activeLayers[i];
      mesh.visible = true;
      mesh.material.map = layer.texture;
      mesh.material.opacity = layer.opacity;
      mesh.material.transparent = true;
      applyBlendMode(mesh.material, layer.blendMode);
      mesh.position.z = -activeLayers.length + i;
      this.applyLayerFit(mesh, layer.fitAssetId);
      mesh.material.needsUpdate = true;
    }

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.compositeScene, this.compositeCamera);
  }

  private renderTrackLayer(
    track: Track,
    time: number,
    dt: number,
    features: FeatureSampler,
    spectrum: SpectralSampler,
    isSeek: boolean,
    isPaused: boolean,
    project: Project,
  ): { texture: THREE.Texture; opacity: number; blendMode: BlendMode; fitAssetId?: string } | null {
    switch (track.type) {
      case "audio":
        return null;
      case "visual": {
        const clip = track.clips.find((c) => time >= c.start && time < c.start + c.duration);
        if (!clip) return null;
        const instance = this.ensureVisualInstance(clip);
        if (isSeek || isPaused) {
          // A frozen or jumped timestamp can't reuse accumulated trails
          // (pausing would blow out to white, seeking would be wrong).
          // Re-simulate a short warmup so the still frame shows
          // representative trails, deterministically for this time.
          instance.reset(this.renderer);
          const step = 1 / project.fps;
          const warmupFrames = 8;
          for (let k = warmupFrames; k >= 0; k--) {
            const warmupTime = Math.max(clip.start, time - k * step);
            instance.render(this.renderer, clip, warmupTime, step, features, spectrum);
          }
        } else {
          instance.render(this.renderer, clip, time, dt, features, spectrum);
        }
        return { texture: instance.texture, opacity: track.opacity, blendMode: track.blendMode };
      }
      case "image": {
        const clip = track.clips.find((c) => time >= c.start && time < c.start + c.duration);
        if (!clip) return null;
        const texture = this.imageTextures.get(clip.assetId);
        if (!texture) return null;
        const image = texture.image as { width: number; height: number };
        this.updateImageFit(clip, project.aspectRatio, image.width, image.height);
        return {
          texture,
          opacity: track.opacity * clip.opacity,
          blendMode: track.blendMode,
          fitAssetId: clip.id,
        };
      }
      default: {
        const exhaustive: never = track;
        throw new Error(`Unhandled track type: ${String(exhaustive)}`);
      }
    }
  }

  private ensureVisualInstance(clip: VisualClip): VisualPresetInstance {
    const cached = this.visualInstances.get(clip.id);
    if (cached && cached.presetId === clip.presetId && cached.seed === clip.seed) {
      return cached.instance;
    }
    cached?.instance.dispose();
    const instance = createPresetInstance(clip.presetId, clip.seed, this.width, this.height);
    this.visualInstances.set(clip.id, { presetId: clip.presetId, seed: clip.seed, instance });
    return instance;
  }

  private releaseStaleInstances(project: Project, _time: number): void {
    const liveClipIds = new Set<string>();
    for (const track of project.tracks) {
      if (track.type !== "visual") continue;
      for (const clip of track.clips) liveClipIds.add(clip.id);
    }
    for (const [clipId, entry] of this.visualInstances) {
      if (!liveClipIds.has(clipId)) {
        entry.instance.dispose();
        this.visualInstances.delete(clipId);
      }
    }
  }

  private syncLayerMeshes(needed: number): void {
    while (this.layerMeshes.length < needed) {
      const material = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      this.compositeScene.add(mesh);
      this.layerMeshes.push(mesh);
    }
    for (let i = 0; i < this.layerMeshes.length; i++) {
      this.layerMeshes[i].visible = i < needed;
    }
  }

  private applyLayerFit(
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
    fitClipId?: string,
  ): void {
    if (!fitClipId) {
      mesh.scale.set(1, 1, 1);
      mesh.position.x = 0;
      mesh.position.y = 0;
      return;
    }
    const entry = this.imageFitCache.get(fitClipId);
    if (entry) {
      mesh.scale.set(entry.scaleX, entry.scaleY, 1);
      mesh.position.x = entry.offsetX;
      mesh.position.y = entry.offsetY;
    }
  }

  private imageFitCache = new Map<
    string,
    { scaleX: number; scaleY: number; offsetX: number; offsetY: number }
  >();

  /**
   * Computes contain/cover placement for an image clip in the current aspect
   * ratio, honoring per-ratio layout overrides.
   */
  private updateImageFit(clip: ImageClip, ratio: AspectRatioId, imageWidth: number, imageHeight: number): void {
    const canvas = ASPECT_RATIOS[ratio];
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = imageWidth / imageHeight;
    const layout = clip.layoutOverrides[ratio] ?? clip.layout;

    let scaleX: number;
    let scaleY: number;
    if (clip.fit === "contain" ? imageAspect > canvasAspect : imageAspect < canvasAspect) {
      scaleX = 1;
      scaleY = canvasAspect / imageAspect;
    } else {
      scaleX = imageAspect / canvasAspect;
      scaleY = 1;
    }

    this.imageFitCache.set(clip.id, {
      scaleX: scaleX * layout.scale,
      scaleY: scaleY * layout.scale,
      offsetX: layout.offsetX,
      offsetY: layout.offsetY,
    });
  }

  /** Resets temporal state (trails); call before deterministic export runs. */
  resetTemporalState(): void {
    this.lastTime = null;
    for (const entry of this.visualInstances.values()) {
      entry.instance.reset(this.renderer);
    }
  }

  dispose(): void {
    for (const entry of this.visualInstances.values()) entry.instance.dispose();
    this.visualInstances.clear();
    for (const texture of this.imageTextures.values()) texture.dispose();
    this.imageTextures.clear();
    for (const mesh of this.layerMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.renderer.dispose();
  }
}
