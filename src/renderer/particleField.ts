import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { evaluateParam } from "@/model/evaluate";
import { paramDescriptor } from "@/renderer/presets";
import { createRng } from "@/renderer/rng";

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uSpread;
uniform float uSpeed;
uniform float uTurbulence;
uniform float uBurst;
uniform float uSize;
uniform float uPixelRatio;

attribute vec4 aSeed; // x: radius, y: theta, z: phi, w: rate

varying float vAlpha;

void main() {
  float radius = uSpread * (0.25 + 0.75 * aSeed.x);
  float theta = aSeed.y * 6.28318530718;
  float phi = acos(2.0 * aSeed.z - 1.0);
  float rate = 0.2 + aSeed.w * 0.8;

  // Stateless orbital motion: position is a pure function of time.
  float angle = theta + uTime * uSpeed * rate;
  vec3 pos = vec3(
    radius * sin(phi) * cos(angle),
    radius * cos(phi),
    radius * sin(phi) * sin(angle)
  );

  // Turbulent drift, also pure in time.
  float t = uTime * (0.6 + rate);
  pos += uTurbulence * 0.35 * vec3(
    sin(t * 1.7 + aSeed.x * 43.0),
    sin(t * 1.3 + aSeed.y * 91.0),
    sin(t * 2.1 + aSeed.z * 17.0)
  );

  // Beat burst: radial displacement away from the origin.
  pos += normalize(pos + vec3(1e-5)) * uBurst * uSpread * 0.6;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  // uPixelRatio carries the resolution scale so preview and export look the
  // same proportionally; 2.2 normalizes for the default camera distance.
  gl_PointSize = uSize * uPixelRatio * (2.2 / max(0.1, -mvPosition.z));
  vAlpha = 0.35 + 0.65 * aSeed.w;
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
  // Quadratic brightness response gives usable range before clipping.
  float a = falloff * vAlpha * uBrightness * uBrightness * uEnergy;
  gl_FragColor = vec4(vec3(1.0), a);
}
`;

/**
 * One particle-field instance per visual clip. Motion is a pure function of
 * (seed, time) in the vertex shader; only the trail accumulation buffer
 * carries state, decayed in a frame-rate-normalized way.
 */
export class ParticleFieldInstance {
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
        uTurbulence: { value: 0.3 },
        uBurst: { value: 0 },
        uSize: { value: 2 },
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
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.decayMaterial);
    this.decayScene.add(quad);
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.targetA.setSize(width, height);
    this.targetB.setSize(width, height);
  }

  /** Texture holding the latest rendered (trailed) frame. */
  get texture(): THREE.Texture {
    return this.targetB.texture;
  }

  private rebuildGeometry(count: number): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }
    const rng = createRng(this.seed);
    const positions = new Float32Array(count * 3); // unused by shader, required by three
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

  /**
   * Renders the clip at an absolute timeline time into the trail buffer.
   * The clip is passed per-frame because the project document is immutable;
   * `dt` is the time since the previous rendered frame, used only for
   * frame-rate-normalized trail decay.
   */
  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
  ): void {
    const resolve = (key: string): number => {
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
    };

    const count = Math.round(resolve("count"));
    if (count !== this.currentCount) this.rebuildGeometry(count);

    const clipTime = timelineTime - clip.start;
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uSpread.value = resolve("spread");
    this.material.uniforms.uSpeed.value = resolve("speed");
    this.material.uniforms.uTurbulence.value = resolve("turbulence");
    this.material.uniforms.uBurst.value = resolve("burst");
    this.material.uniforms.uSize.value = resolve("size");
    this.material.uniforms.uBrightness.value = resolve("brightness");
    // Scale point size with vertical resolution so 1080p export matches the
    // smaller preview canvas proportionally.
    this.material.uniforms.uPixelRatio.value = this.targetA.height / 540;

    const trail = resolve("trail");
    // Normalize decay so trails look the same at any frame rate: `trail` is
    // the per-frame keep factor at 30 FPS.
    const decay = trail <= 0 ? 0 : Math.exp(Math.log(trail) * dt * 30);
    // Compensate additive gain on two axes so the field reads as texture
    // instead of clipping to flat white: longer trails accumulate to
    // alpha/(1-decay), and more particles overlap more per pixel.
    const trailNorm = Math.min(1, Math.max(0.08, (1 - decay) * 2.0));
    const countNorm = Math.min(1, 2000 / Math.max(1, count));
    this.material.uniforms.uEnergy.value = trailNorm * countNorm * 5;

    // 1. Decay previous accumulation from B into A.
    this.decayMaterial.uniforms.uPrev.value = this.targetB.texture;
    this.decayMaterial.uniforms.uDecay.value = decay;
    renderer.setRenderTarget(this.targetA);
    renderer.render(this.decayScene, this.decayCamera);

    // 2. Draw particles additively on top.
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
    renderer.setRenderTarget(null);

    // 3. Swap: B always holds the latest frame.
    const tmp = this.targetA;
    this.targetA = this.targetB;
    this.targetB = tmp;
  }

  /** Clears trail accumulation (used on seek to keep output deterministic). */
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
