import {
  AnimationMixer,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from "three";
import { ASSETS, LOOK } from "../assets.js";
import { createAtmosphere, setAtmosphereFade, updateAtmosphere } from "../effects/Atmosphere.js";
import { loadModel } from "./loadModel.js";
import { fitToRadius, prepareMeshes, stripUtilityNodes } from "./gltfTools.js";

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 5; i += 1) {
    value += amp * noise(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

function paintEarth() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      const v = y / canvas.height;
      const lat = (v - 0.5) * Math.PI;
      const n = fbm(u * 7.5, v * 4.2);
      const land = n > 0.52 && Math.abs(lat) < 1.25;
      const ice = Math.abs(lat) > 1.15;
      let r = 18;
      let g = 62;
      let b = 120;
      if (land) {
        r = 58 + n * 40;
        g = 92 + n * 30;
        b = 46;
      }
      if (ice) {
        r = 230;
        g = 236;
        b = 242;
      }
      const i = (y * canvas.width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function paintMoon() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b7b1a6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 2 + Math.random() * 14;
    ctx.fillStyle = `rgba(70, 68, 64, ${0.15 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class Earth {
  constructor(scene) {
    this.scene = scene;
    this.group = new Group();
    this.group.name = "Earth";
    this.model = new Group();
    this.group.add(this.model);
    this.radius = LOOK.earthRadius;
    this.mixer = null;
    this.clouds = [];
    this.atmosphere = null;
    this.moon = null;
    this.usingFallback = false;
  }

  async load(renderer, hooks) {
    this.scene.add(this.group);
    try {
      const gltf = await loadModel(ASSETS.earth, hooks);
      if (!gltf) return;
      stripUtilityNodes(gltf.scene);
      this.model.add(gltf.scene);
      prepareMeshes(this.model, renderer);
      fitToRadius(this.model, this.radius);
      this.model.traverse((obj) => {
        if (obj.name && /cloud/i.test(obj.name)) this.clouds.push(obj);
        if (!obj.isMesh || !obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          const cloud = /cloud/i.test(material.name || "") || /cloud/i.test(obj.name || "");
          if (cloud && material.map) {
            material.alphaMap = material.map;
            material.map = null;
            material.color.set("#ffffff");
            material.transparent = true;
            material.opacity = 0.72;
            material.depthWrite = false;
            material.roughness = 1;
            material.userData.cloud = true;
            obj.scale.multiplyScalar(1.012);
          }
          if (/earth/i.test(material.name || "")) {
            material.roughness = 0.72;
            material.metalness = 0.04;
            material.emissiveIntensity = 0.85;
          }
          material.userData.baseOpacity = material.opacity ?? 1;
        });
      });
      if (gltf.animations?.length) {
        this.mixer = new AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => this.mixer.clipAction(clip).play());
      }
    } catch (error) {
      console.warn("Terre indisponible, sphère de remplacement.", error);
      this.usingFallback = true;
      const mesh = new Mesh(
        new SphereGeometry(this.radius, 64, 48),
        new MeshStandardMaterial({
          map: paintEarth(),
          roughness: 0.82,
          metalness: 0.04,
        }),
      );
      this.model.add(mesh);
    }

    this.atmosphere = createAtmosphere(this.radius * 1.065, "#7eb6ff", 0.95, 3.15);
    this.group.add(this.atmosphere);
    this._buildMoon();
    this.setFade(0);
  }

  _buildMoon() {
    const moonRadius = this.radius * 0.27;
    this.moon = new Mesh(
      new SphereGeometry(moonRadius, 32, 24),
      new MeshStandardMaterial({
        map: paintMoon(),
        roughness: 0.96,
        metalness: 0.02,
        color: new Color("#d9d3c8"),
      }),
    );
    this.moon.name = "Moon";
    this.moon.position.set(this.radius * 2.55, this.radius * 0.42, -this.radius * 0.35);
    this.scene.add(this.moon);
  }

  setFade(value) {
    const fade = Math.min(1, Math.max(0, value));
    this.group.visible = fade > 0.02;
    this.model.traverse((obj) => {
      if (!obj.isMesh) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (!material) return;
        const cloud = Boolean(material.userData.cloud);
        material.transparent = cloud || fade < 0.98;
        material.opacity = (material.userData.baseOpacity ?? 1) * fade;
        material.depthWrite = !cloud && fade >= 0.98;
      });
    });
    setAtmosphereFade(this.atmosphere, fade);
    if (this.moon) this.moon.visible = fade > 0.35;
  }

  update(dt, camera) {
    this.model.rotation.y += dt * 0.018;
    this.clouds.forEach((cloud) => {
      cloud.rotation.y += dt * 0.012;
    });
    if (this.moon) this.moon.rotation.y += dt * 0.01;
    this.mixer?.update(dt);
    updateAtmosphere(this.atmosphere, camera);
  }
}
