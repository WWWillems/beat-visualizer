import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";
import { DEPTH_FADE_GLSL, configureDepthCamera, radialFamilyGates } from "@/renderer/renderDynamics";
import { createRng } from "@/renderer/rng";

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uTwist;
uniform float uDisplace;
uniform float uSpin;
uniform float uDepth;
uniform float uBass;

varying float vAlpha;
varying float vDepth;

${DEPTH_FADE_GLSL}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 base = position;
  float layer = base.z * 0.5 + 0.5;

  // Progressive per-layer rotation turns the cube grid into a coil/spring.
  float tw = layer * uTwist * 6.28318530718 + uTime * 0.2;
  float cs = cos(tw);
  float sn = sin(tw);
  vec3 pos = vec3(base.x * cs - base.y * sn, base.x * sn + base.y * cs, base.z);

  float h = hash13(base + 3.17);
  pos += normalize(pos + 1e-5) * sin(uTime * 1.3 + h * 6.28318530718) * uDisplace * (0.5 + uBass);

  float spin = uTime * uSpin;
  pos.xz = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * pos.xz;
  pos.z *= 1.0 + uDepth * 1.1;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = 0.4 + 0.6 * h;
  vDepth = depthFade(pos.z, uDepth);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform float uBrightness;
uniform float uEnergy;
varying float vAlpha;
varying float vDepth;

void main() {
  gl_FragColor = vec4(vec3(1.0), vAlpha * vDepth * uBrightness * uBrightness * uEnergy);
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

/** Builds the LINE segment list for an NxNxN node lattice connected along axes. */
export function buildLatticePositions(cells: number, seed: number): Float32Array {
  const n = Math.max(2, Math.round(cells));
  const rng = createRng(seed);
  const jitter = 0.18 / n;
  const node = (i: number, j: number, k: number): [number, number, number] => {
    const x = (i / (n - 1)) * 2 - 1;
    const y = (j / (n - 1)) * 2 - 1;
    const z = (k / (n - 1)) * 2 - 1;
    return [
      x + (rng() - 0.5) * jitter,
      y + (rng() - 0.5) * jitter,
      z + (rng() - 0.5) * jitter,
    ];
  };
  // Precompute jittered nodes deterministically.
  const nodes: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        nodes.push(node(i, j, k));
      }
    }
  }
  const idx = (i: number, j: number, k: number) => k * n * n + j * n + i;
  const segments: number[] = [];
  const push = (a: number, b: number) => {
    segments.push(...nodes[a], ...nodes[b]);
  };
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (i < n - 1) push(idx(i, j, k), idx(i + 1, j, k));
        if (j < n - 1) push(idx(i, j, k), idx(i, j + 1, k));
        if (k < n - 1) push(idx(i, j, k), idx(i, j, k + 1));
      }
    }
  }
  return new Float32Array(segments);
}

export class LatticeInstance {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.ShaderMaterial;
  private lines: THREE.LineSegments | null = null;
  private currentCells = 0;
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
        uTwist: { value: 0 },
        uDisplace: { value: 0.25 },
        uSpin: { value: 0.3 },
        uDepth: { value: 0.5 },
        uBrightness: { value: 0.8 },
        uEnergy: { value: 1 },
        uBass: { value: 0 },
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

  private rebuildGeometry(cells: number): void {
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
    }
    const positions = buildLatticePositions(cells, this.seed);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.lines = new THREE.LineSegments(geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene.add(this.lines);
    this.currentCells = Math.max(2, Math.round(cells));
  }

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
  ): void {
    const cells = Math.max(2, Math.round(resolveParam(clip, "cells", timelineTime, features)));
    if (cells !== this.currentCells) this.rebuildGeometry(cells);

    const clipTime = timelineTime - clip.start;
    const gates = radialFamilyGates(features, timelineTime, resolveParam(clip, "reactivity", timelineTime, features));
    configureDepthCamera(this.camera, this.targetA.width / this.targetA.height, clipTime, gates.depth, 0.06);
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uTwist.value = resolveParam(clip, "twist", timelineTime, features);
    this.material.uniforms.uDisplace.value =
      resolveParam(clip, "displace", timelineTime, features) * (0.7 + gates.accent * 0.6);
    this.material.uniforms.uSpin.value =
      resolveParam(clip, "spin", timelineTime, features) * (0.8 + gates.motion * 0.4);
    this.material.uniforms.uDepth.value = resolveParam(clip, "depth", timelineTime, features);
    this.material.uniforms.uBrightness.value =
      resolveParam(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = features("bass", timelineTime);

    const trail = resolveParam(clip, "trail", timelineTime, features);
    const decay = trail <= 0 ? 0 : Math.exp(Math.log(trail) * dt * 30);
    this.material.uniforms.uEnergy.value = Math.min(1, Math.max(0.18, (1 - decay) * 2.2)) * 2.4;

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
    this.lines?.geometry.dispose();
    this.material.dispose();
    this.decayMaterial.dispose();
    this.targetA.dispose();
    this.targetB.dispose();
  }
}
