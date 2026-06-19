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

  float w = 1.0 - worley(sp);
  float cloud = fbm(sp * 0.6 + uTime * uDrift * 0.05);
  float field = mix(cloud, w, uCells);

  float spec = texture2D(uSpectrum, vec2(clamp(length(p), 0.0, 1.0), 0.5)).r;
  field += spec * 0.15;

  float vign = 1.0 - smoothstep(0.2, 0.95, length(p)) * uFalloff;
  float lum = pow(clamp(field * vign, 0.0, 1.0), uContrast) * uBright * (0.85 + uBass * 0.4);
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
