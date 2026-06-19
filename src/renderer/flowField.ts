import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";
import { DEPTH_FADE_GLSL, configureDepthCamera, flowFamilyGates } from "@/renderer/renderDynamics";
import { createRng } from "@/renderer/rng";

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uSpread;
uniform float uSpeed;
uniform float uCurl;
uniform float uLength;
uniform float uSize;
uniform float uPixelRatio;
uniform float uDepth;
uniform float uFine;

attribute vec4 aSeed;

varying float vAlpha;
varying float vDepth;

${DEPTH_FADE_GLSL}

void main() {
  float strandCount = 7.0 + floor(uCurl * 7.0);
  float strand = floor(aSeed.z * strandCount);
  float strandNorm = strand / max(1.0, strandCount - 1.0);
  float baseX = (aSeed.x * 2.0 - 1.0) * uSpread * 1.2;
  float localY = aSeed.y - 0.5;
  float baseY = (strandNorm * 2.0 - 1.0) * uSpread * 0.72 + localY * uSpread * 0.16;
  float phase = strand * 0.73 + aSeed.w * 6.28318530718;
  float t = uTime * uSpeed + phase;

  float waveA = sin(baseX * (2.0 + uCurl * 6.0) + t);
  float waveB = sin((baseX + baseY) * (1.5 + uCurl * 5.0) - t * 0.77);
  float flow = (waveA * 0.65 + waveB * 0.35) * uCurl;
  float ribbon = localY * uLength * 1.35;
  float grain = sin(t * 2.7 + aSeed.x * 41.0) * uFine * 0.08;

  vec3 pos = vec3(
    baseX + ribbon * cos(flow + phase) * 0.34,
    baseY + flow * 0.32 + ribbon * sin(flow + phase) * 0.7 + grain,
    (strandNorm - 0.5) * uDepth * 1.2 + sin(baseX * 1.8 + t) * uDepth * 0.18
  );

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * uPixelRatio * (2.2 / max(0.1, -mvPosition.z));
  vAlpha = (0.16 + 0.84 * smoothstep(0.5, 0.0, abs(localY))) * (0.45 + 0.55 * aSeed.w);
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
  float a = falloff * vAlpha * vDepth * uBrightness * uBrightness * uEnergy;
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

export class FlowFieldInstance {
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
        uSpread: { value: 1 },
        uSpeed: { value: 0.5 },
        uCurl: { value: 0.5 },
        uLength: { value: 0.5 },
        uSize: { value: 1 },
        uBrightness: { value: 0.7 },
        uEnergy: { value: 1 },
        uPixelRatio: { value: 1 },
        uDepth: { value: 0.45 },
        uFine: { value: 0.25 },
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
    configureDepthCamera(this.camera, width / height, 0, 0.35, 0);
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
    const gates = flowFamilyGates(features, timelineTime, resolveParam(clip, "reactivity", timelineTime, features));
    configureDepthCamera(this.camera, this.targetA.width / this.targetA.height, clipTime, gates.depth, 0.05);
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uSpread.value = resolveParam(clip, "spread", timelineTime, features);
    this.material.uniforms.uSpeed.value = resolveParam(clip, "speed", timelineTime, features) * (0.75 + gates.motion * 0.55);
    this.material.uniforms.uCurl.value = resolveParam(clip, "curl", timelineTime, features) * (0.82 + gates.accent * 0.4);
    this.material.uniforms.uLength.value = resolveParam(clip, "length", timelineTime, features) * (0.85 + gates.motion * 0.35);
    this.material.uniforms.uSize.value = resolveParam(clip, "size", timelineTime, features);
    this.material.uniforms.uBrightness.value =
      resolveParam(clip, "brightness", timelineTime, features) * gates.brightness * (1 + gates.fine * 0.18);
    this.material.uniforms.uPixelRatio.value = this.targetA.height / 540;
    this.material.uniforms.uDepth.value = gates.depth;
    this.material.uniforms.uFine.value = gates.fine;

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
