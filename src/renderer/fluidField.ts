import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { FullscreenPreset, NOISE_GLSL } from "@/renderer/fullscreenPreset";
import { flowFamilyGates } from "@/renderer/renderDynamics";

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSpectrum;
uniform float uFlow;
uniform float uScale;
uniform float uWarp;
uniform float uContrast;
uniform float uBands;
uniform float uBright;
uniform float uBass;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * uScale;
  float t = uTime * uFlow;

  // Iterated domain warp turns smooth fbm into flowing ink / smoke.
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.6)), fbm(p + vec2(5.2, 1.3) + vec2(t * 0.5, 0.0)));
  vec2 r = vec2(
    fbm(p + uWarp * q + vec2(1.7, 9.2)),
    fbm(p + uWarp * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.4))
  );
  float v = fbm(p + uWarp * r + t * 0.1);

  // Optional horizontal stratification for the liquid-band look.
  float bands = 0.5 + 0.5 * sin((vUv.y * 6.0 + v * 3.0 + t * 0.2) * 6.28318530718);
  float field = mix(v, v * 0.5 + bands * 0.5, uBands);

  float spec = texture2D(uSpectrum, vec2(vUv.x, 0.5)).r;
  field += spec * 0.12 * (0.5 + uBass);

  float lum = pow(clamp(field, 0.0, 1.0), uContrast);
  lum *= uBright * (0.8 + uBass * 0.5);
  gl_FragColor = vec4(vec3(lum), 1.0);
}
`;

export class FluidFieldInstance extends FullscreenPreset {
  constructor(_seed: number, width: number, height: number) {
    super(
      FRAGMENT_SHADER,
      {
        uFlow: { value: 0.6 },
        uScale: { value: 2.2 },
        uWarp: { value: 1.4 },
        uContrast: { value: 1.8 },
        uBands: { value: 0 },
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
    const gates = flowFamilyGates(features, timelineTime, reactivity);
    const bass = features("bass", timelineTime);
    this.material.uniforms.uFlow.value =
      this.resolve(clip, "flow", timelineTime, features) * (0.7 + gates.motion * 0.6);
    this.material.uniforms.uScale.value = this.resolve(clip, "scale", timelineTime, features);
    this.material.uniforms.uWarp.value = this.resolve(clip, "warp", timelineTime, features);
    this.material.uniforms.uContrast.value = this.resolve(clip, "contrast", timelineTime, features);
    this.material.uniforms.uBands.value = this.resolve(clip, "bands", timelineTime, features);
    this.material.uniforms.uBright.value =
      this.resolve(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = bass;
  }
}
