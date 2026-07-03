import * as THREE from "three";
import type { SpectralSampler } from "@/audio/features";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";
import { DEPTH_FADE_GLSL, configureDepthCamera, particleFamilyGates } from "@/renderer/renderDynamics";
import { createRng } from "@/renderer/rng";

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uSpread;
uniform float uSpeed;
uniform float uSize;
uniform float uPixelRatio;
uniform float uDepth;

attribute vec4 aSeed;
attribute float aLevel;

varying float vAlpha;
varying float vDepth;

${DEPTH_FADE_GLSL}

void main() {
  float band = aSeed.x;
  float angle = aSeed.y * 6.28318530718 + uTime * uSpeed * (0.18 + band * 0.8);
  float radius = uSpread * (0.16 + pow(aSeed.z, 1.35) * 0.86 + aLevel * 0.42);
  float contour = sin(band * 18.0 + uTime * 0.7 + aSeed.w * 6.28318530718);

  vec3 pos = vec3(
    cos(angle) * radius + contour * uSpread * 0.08,
    (band - 0.5) * uSpread * 1.8 + sin(angle * 2.0) * aLevel * 0.18,
    sin(angle) * radius * (0.52 + uDepth * 0.72) + (aLevel - 0.5) * uDepth * 0.72
  );

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * uPixelRatio * (2.2 / max(0.1, -mvPosition.z));
  vAlpha = (0.16 + aLevel * 0.84) * (0.45 + aSeed.w * 0.55);
  vDepth = depthFade(pos.z, uDepth);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform float uBrightness;
uniform float uEnergy;
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float falloff = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(1.0), falloff * vAlpha * vDepth * uBrightness * uBrightness * uEnergy);
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
  return evaluateParam(clip, key, timelineTime, { min: desc.min, max: desc.max }, desc.defaultValue, features);
}

export class SpectralSwarmInstance {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.ShaderMaterial;
  private points: THREE.Points | null = null;
  private levels: Float32Array | null = null;
  private bandIndices: Uint8Array | null = null;
  private currentCount = 0;
  private readonly spectrumFrame = new Float32Array(64);

  private targetA: THREE.WebGLRenderTarget;
  private targetB: THREE.WebGLRenderTarget;
  private readonly decayScene = new THREE.Scene();
  private readonly decayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly decayMaterial: THREE.ShaderMaterial;

  constructor(private readonly seed: number, width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 50);
    this.camera.position.set(0, 0, 2.2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: 1 },
        uSpeed: { value: 0.6 },
        uSize: { value: 1.4 },
        uBrightness: { value: 0.8 },
        uEnergy: { value: 1 },
        uPixelRatio: { value: 1 },
        uDepth: { value: 0.5 },
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
    configureDepthCamera(this.camera, width / height, 0, 0.5, 0);
    this.targetA.setSize(width, height);
    this.targetB.setSize(width, height);
  }

  get texture(): THREE.Texture {
    return this.targetB.texture;
  }

  private rebuildGeometry(count: number): void {
    this.points?.geometry.dispose();
    if (this.points) this.scene.remove(this.points);

    const rng = createRng(this.seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const levels = new Float32Array(count);
    const bandIndices = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const band = Math.floor(rng() * 64);
      bandIndices[i] = band;
      seeds[i * 4] = band / 63;
      seeds[i * 4 + 1] = rng();
      seeds[i * 4 + 2] = rng();
      seeds[i * 4 + 3] = rng();
      levels[i] = 0;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    geometry.setAttribute("aLevel", new THREE.BufferAttribute(levels, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.levels = levels;
    this.bandIndices = bandIndices;
    this.currentCount = count;
  }

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
    spectrum: SpectralSampler,
  ): void {
    const count = Math.round(resolveParam(clip, "count", timelineTime, features));
    if (count !== this.currentCount) this.rebuildGeometry(count);
    if (!this.points || !this.levels || !this.bandIndices) return;

    spectrum(timelineTime, this.spectrumFrame);
    for (let i = 0; i < this.levels.length; i++) {
      this.levels[i] = this.spectrumFrame[this.bandIndices[i]] ?? 0;
    }
    this.points.geometry.getAttribute("aLevel").needsUpdate = true;

    const clipTime = timelineTime - clip.start;
    const reactivity = resolveParam(clip, "reactivity", timelineTime, features);
    const gates = particleFamilyGates(features, timelineTime, reactivity);
    configureDepthCamera(this.camera, this.targetA.width / this.targetA.height, clipTime, gates.depth, 0.1);
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uSpread.value = resolveParam(clip, "spread", timelineTime, features);
    this.material.uniforms.uSpeed.value = resolveParam(clip, "speed", timelineTime, features) * gates.motion;
    this.material.uniforms.uSize.value = resolveParam(clip, "size", timelineTime, features);
    this.material.uniforms.uBrightness.value =
      resolveParam(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uPixelRatio.value = this.targetA.height / 540;
    this.material.uniforms.uDepth.value = gates.depth;

    const trail = resolveParam(clip, "trail", timelineTime, features);
    const decay = trail <= 0 ? 0 : Math.exp(Math.log(trail) * dt * 30);
    const trailNorm = Math.min(1, Math.max(0.08, (1 - decay) * 2.0));
    const countNorm = Math.min(1, Math.sqrt(1800 / Math.max(1, count)));
    this.material.uniforms.uEnergy.value = trailNorm * countNorm * 5.5;

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
