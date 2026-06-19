import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { FullscreenPreset, NOISE_GLSL } from "@/renderer/fullscreenPreset";
import { clamp01, particleFamilyGates } from "@/renderer/renderDynamics";

/**
 * Per-dot radius (in cell-fraction units) from a field amplitude. Pure so it
 * can be unit-tested; the shader mirrors this expression.
 */
export function halftoneDotRadius(amp: number, dotScale: number, bass: number): number {
  return dotScale * (0.15 + clamp01(amp) * 0.85) * (0.8 + clamp01(bass) * 0.4);
}

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSpectrum;
uniform float uGrid;
uniform float uDotScale;
uniform float uField;
uniform float uSpectrumMix;
uniform float uContrast;
uniform float uBright;
uniform float uBass;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);
  vec2 cells = vec2(uGrid, max(1.0, floor(uGrid / aspect)));
  vec2 g = vUv * cells;
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;

  vec2 cellUv = (cell + 0.5) / cells;
  float n = fbm(cellUv * 3.0 + vec2(uTime * uField, uTime * uField * 0.7));
  float spec = texture2D(uSpectrum, vec2(cellUv.x, 0.5)).r;
  float amp = mix(n, spec, uSpectrumMix);

  float radius = uDotScale * (0.15 + clamp(amp, 0.0, 1.0) * 0.85) * (0.8 + uBass * 0.4);
  float d = length(f);
  float dot = smoothstep(radius, radius * 0.55, d);
  float lum = dot * pow(clamp(amp, 0.0, 1.0), uContrast) * uBright;
  gl_FragColor = vec4(vec3(lum), 1.0);
}
`;

export class HalftoneInstance extends FullscreenPreset {
  constructor(_seed: number, width: number, height: number) {
    super(
      FRAGMENT_SHADER,
      {
        uGrid: { value: 48 },
        uDotScale: { value: 0.45 },
        uField: { value: 0.5 },
        uSpectrumMix: { value: 0.5 },
        uContrast: { value: 1.6 },
        uBright: { value: 0.9 },
        uBass: { value: 0 },
      },
      width,
      height,
    );
  }

  protected updateUniforms(
    clip: VisualClip,
    _clipTime: number,
    timelineTime: number,
    features: FeatureSampler,
  ): void {
    const reactivity = this.resolve(clip, "reactivity", timelineTime, features);
    const gates = particleFamilyGates(features, timelineTime, reactivity);
    this.material.uniforms.uGrid.value = Math.round(this.resolve(clip, "grid", timelineTime, features));
    this.material.uniforms.uDotScale.value = this.resolve(clip, "dotScale", timelineTime, features);
    this.material.uniforms.uField.value =
      this.resolve(clip, "field", timelineTime, features) * (0.6 + gates.motion * 0.7);
    this.material.uniforms.uSpectrumMix.value = this.resolve(clip, "spectrum", timelineTime, features);
    this.material.uniforms.uContrast.value = this.resolve(clip, "contrast", timelineTime, features);
    this.material.uniforms.uBright.value =
      this.resolve(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = features("bass", timelineTime);
  }
}
