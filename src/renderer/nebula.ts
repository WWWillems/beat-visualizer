import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { FullscreenPreset, NOISE_GLSL } from "@/renderer/fullscreenPreset";
import { particleFamilyGates } from "@/renderer/renderDynamics";

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSpectrum;
uniform float uScale;
uniform float uCells;
uniform float uDrift;
uniform float uContrast;
uniform float uFalloff;
uniform float uBright;
uniform float uBass;
varying vec2 vUv;

${NOISE_GLSL}

float worley(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + vec2(31.0, 17.0)));
      vec2 r = g + o - f;
      md = min(md, dot(r, r));
    }
  }
  return sqrt(md);
}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 sp = p * uScale + uTime * uDrift * vec2(0.1, 0.07);

  // Sharpened cells: pow deepens the gaps between worley knots so the
  // cluster reads as distinct cores instead of soft bokeh blobs.
  float w = pow(1.0 - worley(sp), 1.7);
  float cloud = fbm(sp * 0.6 + uTime * uDrift * 0.05);
  // Wispy detail: ridged fine fbm modulates the cells so they read as
  // filamented gas rather than uniform blobs.
  float wisp = 1.0 - abs(fbm(sp * 1.7 - uTime * uDrift * 0.04) * 2.0 - 1.0);
  float field = mix(cloud, w * (0.3 + wisp * 1.05), uCells);

  float spec = texture2D(uSpectrum, vec2(clamp(length(p), 0.0, 1.0), 0.5)).r;
  field += spec * 0.12;

  // Cluster silhouette: an fbm-broken radial mask keeps the nebula an
  // asymmetric subject on black instead of a wall-to-wall texture.
  float edge = fbm(p * 2.3 + vec2(7.7, 3.1));
  float mask = 1.0 - smoothstep(0.12, 0.78, length(p) + (edge - 0.5) * 0.5);
  mask = mix(1.0 - smoothstep(0.2, 0.95, length(p)), mask, uFalloff);

  // Mask before the contrast curve so the rim decays into wisps instead of
  // clamped-bright blobs that ignore the falloff.
  float shaped = clamp(field * mask, 0.0, 1.0);
  float base = pow(shaped, uContrast);
  // Hot cores overshoot 1.0 so bloom picks them up.
  float core = pow(shaped, uContrast * 3.0) * 1.1;
  float lum = (base + core) * uBright * (0.8 + uBass * 0.45);
  gl_FragColor = vec4(vec3(lum), 1.0);
}
`;

export class NebulaInstance extends FullscreenPreset {
  constructor(_seed: number, width: number, height: number) {
    super(
      FRAGMENT_SHADER,
      {
        uScale: { value: 3.5 },
        uCells: { value: 0.6 },
        uDrift: { value: 0.4 },
        uContrast: { value: 2.0 },
        uFalloff: { value: 0.5 },
        uBright: { value: 0.85 },
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
    this.material.uniforms.uScale.value = this.resolve(clip, "scale", timelineTime, features);
    this.material.uniforms.uCells.value = this.resolve(clip, "cells", timelineTime, features);
    this.material.uniforms.uDrift.value =
      this.resolve(clip, "drift", timelineTime, features) * (0.6 + gates.motion * 0.7);
    this.material.uniforms.uContrast.value = this.resolve(clip, "contrast", timelineTime, features);
    this.material.uniforms.uFalloff.value = this.resolve(clip, "falloff", timelineTime, features);
    this.material.uniforms.uBright.value =
      this.resolve(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = features("bass", timelineTime);
  }
}
