import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { FullscreenPreset, NOISE_GLSL } from "@/renderer/fullscreenPreset";
import { particleFamilyGates } from "@/renderer/renderDynamics";

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSpectrum;
uniform float uShape;
uniform float uSize;
uniform float uEdge;
uniform float uGrain;
uniform float uDensity;
uniform float uBright;
uniform float uBass;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);
  // Subject sits slightly right of center, like the reference plate.
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) - vec2(0.12, 0.0);

  vec2 q = abs(p) - vec2(uSize);
  float dSquare = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float dRing = length(p) - uSize;
  float dist = mix(dSquare, dRing, step(0.5, uShape));
  float outline = 1.0 - smoothstep(0.0, uEdge, abs(dist));
  // A second, softer echo line just outside the primitive.
  float echo = (1.0 - smoothstep(0.0, uEdge * 6.0, abs(dist - uEdge * 8.0))) * 0.2;

  // Animated film grain, stepped to ~24 distinct frames/sec so it is a pure
  // function of time (deterministic preview/export).
  vec2 cell = floor(vUv * uResolution / max(1.0, uDensity));
  float seed = floor(uTime * 24.0);
  float gr = hash21(cell + vec2(seed, seed * 1.7));

  // Grain is a fog hugging the primitive: dense near the shape, decaying to
  // black at the edges, with a drifting fbm cloud breaking up uniformity.
  // Gated by (1 - outline) so the fog never sits on the wire itself.
  float halo = exp(-max(0.0, abs(dist)) * 5.5);
  float cloudMask = fbm(p * 2.4 + vec2(uTime * 0.05, 0.0));
  float fog = halo * (0.35 + cloudMask * 0.85) * (1.0 - outline);
  float grain = pow(gr, 1.8) * uGrain * fog * (0.8 + uBass * 0.7);

  // The outline overshoots 1.0 so bloom gives it a hot-wire glow.
  float lum = outline * uBright * 2.4 + echo * uBright + grain;
  gl_FragColor = vec4(vec3(lum), 1.0);
}
`;

export class GrainFieldInstance extends FullscreenPreset {
  constructor(_seed: number, width: number, height: number) {
    super(
      FRAGMENT_SHADER,
      {
        uShape: { value: 0 },
        uSize: { value: 0.46 },
        uEdge: { value: 0.03 },
        uGrain: { value: 0.55 },
        uDensity: { value: 1.6 },
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
    this.material.uniforms.uShape.value = this.resolve(clip, "shape", timelineTime, features);
    this.material.uniforms.uSize.value = this.resolve(clip, "size", timelineTime, features);
    this.material.uniforms.uEdge.value = this.resolve(clip, "edge", timelineTime, features);
    this.material.uniforms.uGrain.value =
      this.resolve(clip, "grain", timelineTime, features) * (0.7 + gates.accent * 0.5);
    this.material.uniforms.uDensity.value = this.resolve(clip, "density", timelineTime, features);
    this.material.uniforms.uBright.value =
      this.resolve(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = features("bass", timelineTime);
  }
}
