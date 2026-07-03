import * as THREE from "three";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";
import { DEPTH_FADE_GLSL, configureDepthCamera, flowFamilyGates } from "@/renderer/renderDynamics";
import { createRng } from "@/renderer/rng";

const SEGMENTS_PER_STROKE = 24;

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uLength;
uniform float uCurl;
uniform float uSpeed;
uniform float uSpread;
uniform float uWobble;
uniform float uDepth;
uniform float uBass;

attribute vec4 aSeed; // x: angle, y: radius, z: phase, w: dir
attribute float aT;   // 0..1 along the stroke

varying float vAlpha;
varying float vDepth;

${DEPTH_FADE_GLSL}

void main() {
  float a0 = aSeed.x * 6.28318530718;
  float r0 = uSpread * (0.1 + aSeed.y * 0.9);
  float phase = aSeed.z * 6.28318530718;
  float dir = aSeed.w < 0.5 ? -1.0 : 1.0;
  float t = aT;

  float ang = a0 + t * uCurl * dir * 2.0 + sin(uTime * uSpeed + phase) * uWobble * 0.6;
  float rad = r0 + t * uLength * (1.0 + uBass * 0.4);
  vec2 xy = vec2(cos(ang), sin(ang)) * rad;
  xy += vec2(sin(t * 9.0 + phase), cos(t * 7.0 + phase)) * uWobble * 0.05 * t;

  vec3 pos = vec3(xy, (aSeed.y - 0.5) * uDepth * 0.6);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  // Bright at the root, fading toward the tip for a brush/fiber falloff.
  vAlpha = (0.25 + 0.75 * (1.0 - t)) * (0.45 + aSeed.z * 0.55);
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

export class StrokesInstance {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.ShaderMaterial;
  private lines: THREE.LineSegments | null = null;
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
        uLength: { value: 0.7 },
        uCurl: { value: 1.2 },
        uSpeed: { value: 0.5 },
        uSpread: { value: 0.5 },
        uWobble: { value: 0.3 },
        uDepth: { value: 0.45 },
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
    configureDepthCamera(this.camera, width / height, 0, 0.45, 0);
    this.targetA.setSize(width, height);
    this.targetB.setSize(width, height);
  }

  get texture(): THREE.Texture {
    return this.targetB.texture;
  }

  private rebuildGeometry(count: number): void {
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
    }
    const strokes = Math.max(1, Math.round(count));
    const vertsPerStroke = SEGMENTS_PER_STROKE * 2;
    const total = strokes * vertsPerStroke;
    const positions = new Float32Array(total * 3);
    const seeds = new Float32Array(total * 4);
    const ts = new Float32Array(total);
    const rng = createRng(this.seed);
    let v = 0;
    for (let s = 0; s < strokes; s++) {
      const a = rng();
      const r = rng();
      const phase = rng();
      const dir = rng();
      for (let seg = 0; seg < SEGMENTS_PER_STROKE; seg++) {
        const t0 = seg / SEGMENTS_PER_STROKE;
        const t1 = (seg + 1) / SEGMENTS_PER_STROKE;
        for (const t of [t0, t1]) {
          seeds[v * 4] = a;
          seeds[v * 4 + 1] = r;
          seeds[v * 4 + 2] = phase;
          seeds[v * 4 + 3] = dir;
          ts[v] = t;
          v++;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    geometry.setAttribute("aT", new THREE.BufferAttribute(ts, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.lines = new THREE.LineSegments(geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene.add(this.lines);
    this.currentCount = strokes;
  }

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    dt: number,
    features: FeatureSampler,
  ): void {
    const count = Math.max(1, Math.round(resolveParam(clip, "count", timelineTime, features)));
    if (count !== this.currentCount) this.rebuildGeometry(count);

    const clipTime = timelineTime - clip.start;
    const gates = flowFamilyGates(features, timelineTime, resolveParam(clip, "reactivity", timelineTime, features));
    configureDepthCamera(this.camera, this.targetA.width / this.targetA.height, clipTime, gates.depth, 0.05);
    this.material.uniforms.uTime.value = clipTime;
    this.material.uniforms.uLength.value = resolveParam(clip, "length", timelineTime, features);
    this.material.uniforms.uCurl.value =
      resolveParam(clip, "curl", timelineTime, features) * (0.85 + gates.accent * 0.4);
    this.material.uniforms.uSpeed.value =
      resolveParam(clip, "speed", timelineTime, features) * (0.7 + gates.motion * 0.6);
    this.material.uniforms.uSpread.value = resolveParam(clip, "spread", timelineTime, features);
    this.material.uniforms.uWobble.value =
      resolveParam(clip, "wobble", timelineTime, features) * (0.8 + gates.fine * 0.5);
    this.material.uniforms.uDepth.value = gates.depth;
    this.material.uniforms.uBrightness.value =
      resolveParam(clip, "brightness", timelineTime, features) * gates.brightness;
    this.material.uniforms.uBass.value = features("bass", timelineTime);

    const trail = resolveParam(clip, "trail", timelineTime, features);
    const decay = trail <= 0 ? 0 : Math.exp(Math.log(trail) * dt * 30);
    // Every stroke rasterizes ~24 overlapping segments, so per-line alpha
    // must stay far below 1 or the swirl clips to a white blob.
    const trailNorm = Math.min(1, Math.max(0.1, (1 - decay) * 2.0));
    const countNorm = Math.min(1, 600 / Math.max(1, count));
    this.material.uniforms.uEnergy.value = trailNorm * countNorm * 0.35;

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
