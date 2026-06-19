import * as THREE from "three";
import { SPECTRAL_BIN_COUNT, type SpectralSampler } from "@/audio/features";
import { evaluateParam, type FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";

/**
 * Builds a 1D data texture holding the 64-bin spectral profile so fragment
 * shaders can read per-bin energy. NearestFilter keeps bin boundaries crisp;
 * RedFormat + FloatType is read as `.r` in GLSL.
 */
export function createSpectrumTexture(): THREE.DataTexture {
  const data = new Float32Array(SPECTRAL_BIN_COUNT);
  const texture = new THREE.DataTexture(
    data,
    SPECTRAL_BIN_COUNT,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * GLSL helpers shared by the fragment-shader preset families: value noise,
 * fractal Brownian motion, and a cheap hash. Deterministic functions of their
 * inputs only, so preview and export stay identical (ADR 0008).
 */
export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * valueNoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}
`;

/**
 * Base class for fragment-shader preset families. Owns a fullscreen quad, a
 * half-float render target, and the common uniforms (`uTime`, `uResolution`,
 * `uSpectrum`). Subclasses supply a fragment shader plus their own uniforms and
 * implement `updateUniforms` to map clip params and audio features each frame.
 *
 * The render is a pure function of (clip params, time, features) — no trail
 * accumulation here — so these presets are deterministic without warmup.
 */
export abstract class FullscreenPreset {
  protected readonly scene = new THREE.Scene();
  protected readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  protected readonly material: THREE.ShaderMaterial;
  protected readonly target: THREE.WebGLRenderTarget;
  protected readonly spectrumTexture = createSpectrumTexture();
  protected readonly spectrumFrame = new Float32Array(SPECTRAL_BIN_COUNT);

  constructor(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
    width: number,
    height: number,
  ) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uSpectrum: { value: this.spectrumTexture },
        ...uniforms,
      },
      depthWrite: false,
      depthTest: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));

    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  setSize(width: number, height: number): void {
    this.target.setSize(width, height);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  /** Resolves a clip param at `timelineTime`, honoring keyframes + modulation. */
  protected resolve(
    clip: VisualClip,
    key: string,
    timelineTime: number,
    features: FeatureSampler,
  ): number {
    const desc = paramDescriptor(clip.presetId, key);
    if (!desc) return 0;
    return evaluateParam(
      clip,
      key,
      timelineTime,
      { min: desc.min, max: desc.max },
      desc.defaultValue,
      features,
    );
  }

  /** Subclasses map clip params + audio features onto their shader uniforms. */
  protected abstract updateUniforms(
    clip: VisualClip,
    clipTime: number,
    timelineTime: number,
    features: FeatureSampler,
  ): void;

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    _dt: number,
    features: FeatureSampler,
    spectrum: SpectralSampler,
  ): void {
    spectrum(timelineTime, this.spectrumFrame);
    (this.spectrumTexture.image.data as Float32Array).set(this.spectrumFrame);
    this.spectrumTexture.needsUpdate = true;

    const clipTime = timelineTime - clip.start;
    this.material.uniforms.uTime.value = clipTime;
    this.updateUniforms(clip, clipTime, timelineTime, features);

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }

  reset(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);
    renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.material.dispose();
    this.spectrumTexture.dispose();
    this.target.dispose();
  }
}
