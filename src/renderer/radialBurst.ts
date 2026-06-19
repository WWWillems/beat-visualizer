import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { particleAudioGates, particleVisualEnergy } from "@/renderer/particleField";
import { paramDescriptor } from "@/renderer/presets";
import { createRng } from "@/renderer/rng";

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uRays;
uniform float uRadius;
uniform float uSpread;
uniform float uSpin;
uniform float uWobble;
uniform float uBurst;
uniform float uSize;
uniform float uPixelRatio;

attribute vec4 aSeed;

varying float vAlpha;

void main() {
  float rays = max(1.0, uRays);
  float ray = floor(aSeed.x * rays);
  float rayJitter = (aSeed.y - 0.5) * uSpread;
  float angle = (ray + rayJitter) / rays * 6.28318530718;
  angle += uTime * uSpin + sin(uTime * 0.9 + aSeed.z * 12.0) * uWobble * 0.25;

  float radialNoise = pow(aSeed.z, 0.55);
  float pulse = sin(uTime * 2.0 + aSeed.w * 6.28318530718) * 0.08 * uWobble;
  float radius = uRadius * (0.2 + radialNoise * 0.9) + uBurst * (0.15 + aSeed.w * 0.45) + pulse;
  float thickness = (aSeed.y - 0.5) * uSpread * 0.65;

  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 xy = dir * radius + normal * thickness;
  vec3 pos = vec3(xy, (aSeed.w - 0.5) * 0.25);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * uPixelRatio * (2.2 / max(0.1, -mvPosition.z));
  vAlpha = 0.28 + 0.72 * (1.0 - radialNoise);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform float uBrightness;
uniform float uEnergy;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float falloff = smoothstep(0.5, 0.0, d);
  float a = falloff * vAlpha * uBrightness * uBrightness * uEnergy;
  gl_FragColor = vec4(vec3(1.0), a);
}
`;

function resolveParam(
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

export class RadialBurstInstance {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.ShaderMaterial;
  private points: THREE.Points | null = null;
  private currentCount = 0;
  private readonly seed: number;

  private targetA: THREE.WebGLRenderTarget;
  private targetB: THREE.WebGLRenderTarget;
  private readonly decayScene = new THREE.Scene();
  private readonly decayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly decayMaterial: THREE.ShaderMaterial;

  constructor(seed: number, width: number, height: number) {
    this.seed = seed;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 50);
    this.camera.position.set(0, 0, 2.2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uRays: { value: 12 },
        uRadius: { value: 0.8 },
        uSpread: { value: 0.2 },
        uSpin: { value: 0.3 },
        uWobble: { value: 0.3 },
        uBurst: { value: 0.2 },
        uSize: { value: 1 },
        uBrightness: { value: 0.8 },
        uEnergy: { value: 1 },
        uPixelRatio: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const targetOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    };
    this.targetA = new THREE.WebGLRenderTarget(width, height, targetOptions);
    this.targetB = new THREE.WebGLRenderTarget(width, height, targetOptions);

    this.decayMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uPrev;
        uniform float uDecay;
        varying vec2 vUv;
        void main() {
          vec4 prev = texture2D(uPrev, vUv);
          gl_FragColor = vec4(prev.rgb * uDecay, 1.0);
        }
      `,
      uniforms: {
        uPrev: { value: null },
        uDecay: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.decayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.decayMaterial));
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.targetA.setSize(width, height);
    this.targetB.setSize(width, height);
  }

  get texture(): THREE.Texture {
    return this.targetB.texture;
  }

  private rebuildGeometry(count: number): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }
    const rng = createRng(this.seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = rng();
      seeds[i * 4 + 1] = rng();
      seeds[i * 4 + 2] = rng();
      seeds[i * 4 + 3] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.currentCount = count;
  }

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
  ): void {
    const count = Math.round(resolveParam(clip, "count", timelineTime, features));
    if (count !== this.currentCount) this.rebuildGeometry(count);

    const clipTime = timelineTime - clip.start;
    const gates = particleAudioGates(
      particleVisualEnergy(features, timelineTime),
      resolveParam(clip, "reactivity", timelineTime, features),
    );
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uRays.value = resolveParam(clip, "rays", timelineTime, features);
    this.material.uniforms.uRadius.value = resolveParam(clip, "radius", timelineTime, features);
    this.material.uniforms.uSpread.value = resolveParam(clip, "spread", timelineTime, features);
    this.material.uniforms.uSpin.value = resolveParam(clip, "spin", timelineTime, features) * gates.motion;
    this.material.uniforms.uWobble.value = resolveParam(clip, "wobble", timelineTime, features) * gates.motion;
    this.material.uniforms.uBurst.value = resolveParam(clip, "burst", timelineTime, features) * gates.motion;
    this.material.uniforms.uSize.value = resolveParam(clip, "size", timelineTime, features);
    this.material.uniforms.uBrightness.value =
      resolveParam(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uPixelRatio.value = this.targetA.height / 540;

    const trail = resolveParam(clip, "trail", timelineTime, features);
    const decay = trail <= 0 ? 0 : Math.exp(Math.log(trail) * dt * 30);
    const trailNorm = Math.min(1, Math.max(0.08, (1 - decay) * 2.0));
    const countNorm = Math.min(1, 2200 / Math.max(1, count));
    this.material.uniforms.uEnergy.value = trailNorm * countNorm * 5;

    this.decayMaterial.uniforms.uPrev.value = this.targetB.texture;
    this.decayMaterial.uniforms.uDecay.value = decay;
    renderer.setRenderTarget(this.targetA);
    renderer.render(this.decayScene, this.decayCamera);

    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
    renderer.setRenderTarget(null);

    const tmp = this.targetA;
    this.targetA = this.targetB;
    this.targetB = tmp;
  }

  reset(renderer: THREE.WebGLRenderer): void {
    for (const target of [this.targetA, this.targetB]) {
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.points?.geometry.dispose();
    this.material.dispose();
    this.decayMaterial.dispose();
    this.targetA.dispose();
    this.targetB.dispose();
  }
}
