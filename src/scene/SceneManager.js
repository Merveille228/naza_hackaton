import {
  ACESFilmicToneMapping,
  Color,
  HalfFloatType,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Vector2 } from "three";

export function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  if (cores <= 4 || memory <= 4) return "low";
  return "high";
}

export class SceneManager {
  constructor(host) {
    this.host = host;
    this.quality = detectQuality();
    this.scene = new Scene();
    this.scene.background = new Color("#020308");
    this.scene.environmentIntensity = 0.16;

    this.camera = new PerspectiveCamera(42, 1, 0.35, 8000);
    this.renderer = new WebGLRenderer({
      antialias: this.quality === "high",
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(0x020308, 1);

    this.pixelRatioCap = this.quality === "low" ? 1 : 1.35;
    this.dom = this.renderer.domElement;
    this.dom.style.width = "100%";
    this.dom.style.height = "100%";
    this.dom.style.display = "block";
    host.appendChild(this.dom);

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.composer = null;
    this.bloom = null;
    if (this.quality === "high") {
      const size = new Vector2(1, 1);
      const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(size, 0.035, 0.3, 0.98);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();
  }

  resize() {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(width, height);
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;
  }

  setSpaceBackground() {
    this.scene.background = new Color("#020308");
    this.scene.fog = null;
    this.camera.near = 0.35;
    this.camera.far = 8000;
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 0.9;
  }

  setSurfaceBackground(fog) {
    this.scene.background = new Color("#3a2018");
    this.scene.fog = fog;
    this.camera.near = 0.05;
    this.camera.far = 1600;
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 1.0;
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.composer?.dispose();
    this.scene.environment?.dispose?.();
    this.renderer.dispose();
    this.dom.remove();
  }
}
