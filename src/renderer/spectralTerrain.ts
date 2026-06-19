import * as THREE from "three";
import type { SpectralSampler } from "@/audio/features";
import type { FeatureSampler } from "@/model/evaluate";
import { evaluateParam } from "@/model/evaluate";
import type { VisualClip } from "@/model/types";
import { paramDescriptor } from "@/renderer/presets";
import { flowFamilyGates } from "@/renderer/renderDynamics";

const BINS = 64;
const ROWS = 48;

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

export function spectralTerrainRidge(rawLevel: number, contrast: number): number {
  const level = Math.max(0, rawLevel);
  const drive = Math.max(0.001, contrast);
  const compressed = Math.log1p(level * drive) / Math.log1p(drive);
  return Math.pow(compressed, 1.35);
}

function createTerrainGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(BINS * ROWS * 3);
  const uvs = new Float32Array(BINS * ROWS * 2);
  const indices: number[] = [];

  for (let row = 0; row < ROWS; row++) {
    const z = row / (ROWS - 1);
    for (let col = 0; col < BINS; col++) {
      const x = col / (BINS - 1);
      const index = row * BINS + col;
      positions[index * 3] = (x - 0.5) * 2.6;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = (z - 0.5) * -2.2;
      uvs[index * 2] = x;
      uvs[index * 2 + 1] = z;
    }
  }

  for (let row = 0; row < ROWS - 1; row++) {
    for (let col = 0; col < BINS - 1; col++) {
      const a = row * BINS + col;
      const b = a + 1;
      const c = a + BINS;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
  return geometry;
}

export class SpectralTerrainInstance {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly geometry = createTerrainGeometry();
  private readonly mesh: THREE.Mesh;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly spectrumFrame = new Float32Array(BINS);

  constructor(_seed: number, width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.01, 50);
    this.camera.position.set(0, 1.05, 2.45);
    this.camera.lookAt(0, 0, 0);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -0.18;
    this.scene.add(this.mesh);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-0.4, 1.6, 1.2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(1.1, 0.8, -1.3);
    this.scene.add(rim);

    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.target.setSize(width, height);
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  render(
    renderer: THREE.WebGLRenderer,
    clip: VisualClip,
    timelineTime: number,
    _dt: number,
    features: FeatureSampler,
    spectrum: SpectralSampler,
  ): void {
    const clipTime = timelineTime - clip.start;
    const reactivity = resolveParam(clip, "reactivity", timelineTime, features);
    const gates = flowFamilyGates(features, timelineTime, reactivity);
    const height = resolveParam(clip, "height", timelineTime, features) * (0.72 + gates.motion * 0.5);
    const depth = resolveParam(clip, "depth", timelineTime, features);
    const history = resolveParam(clip, "history", timelineTime, features);
    const contrast = resolveParam(clip, "contrast", timelineTime, features);
    const brightness = resolveParam(clip, "brightness", timelineTime, features) * gates.brightness;
    const positions = this.geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let row = 0; row < ROWS; row++) {
      const rowT = row / (ROWS - 1);
      const sampleTime = Math.max(clip.start, timelineTime - rowT * history);
      spectrum(sampleTime, this.spectrumFrame);
      for (let col = 0; col < BINS; col++) {
        const index = row * BINS + col;
        const x = col / (BINS - 1);
        const ridge = spectralTerrainRidge(this.spectrumFrame[col] ?? 0, contrast);
        positions.setXYZ(index, (x - 0.5) * 2.75, ridge * height - 0.28, (rowT - 0.5) * -2.4 * depth);
      }
    }
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.mesh.rotation.z = Math.sin(clipTime * 0.16) * 0.035;
    this.camera.position.set(Math.sin(clipTime * 0.08) * 0.18, 1.05 + gates.depth * 0.18, 2.35 + depth * 0.25);
    this.camera.lookAt(0, 0.05, 0);
    this.material.opacity = Math.min(1, Math.max(0.18, brightness));
    this.material.transparent = true;

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }

  reset(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.target.dispose();
  }
}
