import * as THREE from "three";

/**
 * Global post-processing applied to the composited frame: a soft bloom on the
 * brightest regions, a contrast/levels curve, and time-seeded film grain. Runs
 * after layer compositing and writes the final sRGB image to the canvas.
 *
 * Determinism (ADR 0008): grain is a pure hash of (pixel, time), never
 * `random()`, so preview and export produce identical frames.
 */
export interface PostFxConfig {
  bloomStrength: number;
  bloomThreshold: number;
  grain: number;
  /** Exposure for the filmic shoulder; higher = brighter hot cores. */
  exposure: number;
  /** Output gamma > 1 crushes blacks for a subject-on-black read. */
  gamma: number;
  /** 0..1 edge darkening. */
  vignette: number;
}

export const DEFAULT_POST_FX: PostFxConfig = {
  bloomStrength: 0.9,
  bloomThreshold: 0.3,
  grain: 0.06,
  exposure: 1.7,
  gamma: 1.35,
  vignette: 0.32,
};

const BRIGHT_FRAGMENT = /* glsl */ `
uniform sampler2D uScene;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uScene, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float k = max(0.0, l - uThreshold);
  gl_FragColor = vec4(l > 0.0 ? c * (k / l) : vec3(0.0), 1.0);
}
`;

const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec2 o = uTexel * uDir;
  vec3 sum = texture2D(uTex, vUv).rgb * 0.2270270270;
  sum += texture2D(uTex, vUv + o * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(uTex, vUv - o * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(uTex, vUv + o * 3.2307692308).rgb * 0.0702702703;
  sum += texture2D(uTex, vUv - o * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(sum, 1.0);
}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uGamma;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec3 linearToSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  vec3 bloom = texture2D(uBloom, vUv).rgb;
  vec3 col = scene + bloom * uBloomStrength;

  // Filmic shoulder: bright cores roll toward white instead of hard-clipping,
  // then a >1 gamma crushes the low end so subjects sit on true black.
  col = 1.0 - exp(-col * uExposure);
  col = pow(clamp(col, 0.0, 1.0), vec3(uGamma));

  float r = length(vUv - 0.5) * 1.41421356;
  col *= 1.0 - smoothstep(0.55, 1.05, r) * uVignette;

  vec3 srgb = linearToSRGB(col);
  float g = hash(gl_FragCoord.xy + vec2(uTime * 61.0, uTime * 37.0)) - 0.5;
  srgb = clamp(srgb + g * uGrain, 0.0, 1.0);
  gl_FragColor = vec4(srgb, 1.0);
}
`;

const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

function half(value: number): number {
  return Math.max(1, Math.floor(value / 2));
}

export class PostFx {
  /** Layer compositing renders here; `render` turns it into the final image. */
  readonly sceneTarget: THREE.WebGLRenderTarget;
  private bloomA: THREE.WebGLRenderTarget;
  private bloomB: THREE.WebGLRenderTarget;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private readonly brightMaterial: THREE.ShaderMaterial;
  private readonly blurMaterial: THREE.ShaderMaterial;
  private readonly compositeMaterial: THREE.ShaderMaterial;

  private width: number;
  private height: number;

  constructor(width: number, height: number, config: PostFxConfig = DEFAULT_POST_FX) {
    this.width = width;
    this.height = height;

    const hdr: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    };
    this.sceneTarget = new THREE.WebGLRenderTarget(width, height, hdr);
    this.bloomA = new THREE.WebGLRenderTarget(half(width), half(height), hdr);
    this.bloomB = new THREE.WebGLRenderTarget(half(width), half(height), hdr);

    this.brightMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: BRIGHT_FRAGMENT,
      uniforms: {
        uScene: { value: this.sceneTarget.texture },
        uThreshold: { value: config.bloomThreshold },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      uniforms: {
        uTex: { value: null },
        uTexel: { value: new THREE.Vector2(1 / half(width), 1 / half(height)) },
        uDir: { value: new THREE.Vector2(1, 0) },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      uniforms: {
        uScene: { value: this.sceneTarget.texture },
        uBloom: { value: this.bloomA.texture },
        uBloomStrength: { value: config.bloomStrength },
        uExposure: { value: config.exposure },
        uGamma: { value: config.gamma },
        uVignette: { value: config.vignette },
        uGrain: { value: config.grain },
        uTime: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMaterial);
    this.scene.add(this.quad);
  }

  setConfig(config: PostFxConfig): void {
    this.brightMaterial.uniforms.uThreshold.value = config.bloomThreshold;
    this.compositeMaterial.uniforms.uBloomStrength.value = config.bloomStrength;
    this.compositeMaterial.uniforms.uExposure.value = config.exposure;
    this.compositeMaterial.uniforms.uGamma.value = config.gamma;
    this.compositeMaterial.uniforms.uVignette.value = config.vignette;
    this.compositeMaterial.uniforms.uGrain.value = config.grain;
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.sceneTarget.setSize(width, height);
    this.bloomA.setSize(half(width), half(height));
    this.bloomB.setSize(half(width), half(height));
    (this.blurMaterial.uniforms.uTexel.value as THREE.Vector2).set(
      1 / half(width),
      1 / half(height),
    );
  }

  private pass(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  /** Consumes `sceneTarget` and writes the post-processed sRGB frame to canvas. */
  render(renderer: THREE.WebGLRenderer, time: number): void {
    this.pass(renderer, this.brightMaterial, this.bloomA);

    // Two separable blur iterations give the bloom a wide, soft halo.
    for (let i = 0; i < 2; i++) {
      this.blurMaterial.uniforms.uTex.value = this.bloomA.texture;
      (this.blurMaterial.uniforms.uDir.value as THREE.Vector2).set(1 + i, 0);
      this.pass(renderer, this.blurMaterial, this.bloomB);

      this.blurMaterial.uniforms.uTex.value = this.bloomB.texture;
      (this.blurMaterial.uniforms.uDir.value as THREE.Vector2).set(0, 1 + i);
      this.pass(renderer, this.blurMaterial, this.bloomA);
    }

    this.compositeMaterial.uniforms.uTime.value = time;
    this.pass(renderer, this.compositeMaterial, null);
    renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.quad.geometry.dispose();
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.sceneTarget.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
  }
}
