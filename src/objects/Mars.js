import {
  BackSide,
  CanvasTexture,
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
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

function paintMars() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const n = fbm(x * 0.02, y * 0.02);
      const r = 150 + n * 70;
      const g = 62 + n * 30;
      const b = 36 + n * 16;
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

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class Mars {
  constructor(scene) {
    this.scene = scene;
    this.planetGroup = new Group();
    this.planetGroup.name = "Mars";
    this.model = new Group();
    this.planetGroup.add(this.model);
    this.surfaceGroup = new Group();
    this.surfaceGroup.name = "MarsSurface";
    this.surfaceGroup.visible = false;
    this.radius = LOOK.marsRadius;
    this.center = this.planetGroup.position;
    this.atmosphere = null;
    this.fog = new FogExp2("#c4845c", 0.0065);
    this.albedo = null;
    this.usingFallback = false;
  }

  async load(renderer, hooks, quality) {
    this.scene.add(this.planetGroup);
    this.scene.add(this.surfaceGroup);
    this.planetGroup.position.set(90, 40, 1980);

    try {
      const gltf = await loadModel(ASSETS.mars, hooks);
      if (!gltf) return;
      stripUtilityNodes(gltf.scene);
      this.model.add(gltf.scene);
      prepareMeshes(this.model, renderer);
      this.model.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (material.map && !this.albedo) this.albedo = material.map;
        material.roughness = 0.92;
        material.metalness = 0.02;
        material.emissive = new Color("#000000");
        material.emissiveIntensity = 0;
      });
      fitToRadius(this.model, this.radius);
    } catch (error) {
      console.warn("Mars indisponible, sphère de remplacement.", error);
      this.usingFallback = true;
      this.albedo = paintMars();
      const mesh = new Mesh(
        new SphereGeometry(this.radius, 64, 48),
        new MeshStandardMaterial({
          map: this.albedo,
          roughness: 0.94,
          metalness: 0.02,
          color: "#d27a52",
        }),
      );
      this.model.add(mesh);
    }

    this.atmosphere = createAtmosphere(this.radius * 1.045, "#e7a07a", 0.62, 2.5);
    this.planetGroup.add(this.atmosphere);
    this._buildSurface(quality);
    this.setFade(0);
  }

  _buildSurface(quality) {
    const segments = quality === "low" ? 72 : 120;
    const geometry = new PlaneGeometry(760, 760, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const dist = Math.hypot(x, z);
      const mask = smoothstep(16, 150, dist);
      const dunes = fbm(x * 0.012, z * 0.012);
      const detail = fbm(x * 0.05, z * 0.05);
      let height = (dunes - 0.35) * 11 * mask + (detail - 0.5) * 1.4 * mask;
      if (dist > 40 && dist < 220 && dunes > 0.62) height -= 1.8;
      positions.setY(i, height);
    }
    geometry.computeVertexNormals();

    let map = null;
    if (this.albedo) {
      map = this.albedo.clone();
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.repeat.set(0.18, 0.18);
      map.offset.set(0.38, 0.52);
      map.needsUpdate = true;
    }

    const terrain = new Mesh(
      geometry,
      new MeshStandardMaterial({
        map,
        color: map ? "#ffffff" : "#b85a38",
        roughness: 0.97,
        metalness: 0.02,
      }),
    );
    terrain.name = "Terrain";
    this.surfaceGroup.add(terrain);

    const sky = new Mesh(new SphereGeometry(520, 32, 20), this._skyMaterial());
    sky.name = "MarsSky";
    sky.renderOrder = -2;
    this.surfaceGroup.add(sky);

    const rockMat = new MeshStandardMaterial({
      color: "#a85b3c",
      map,
      roughness: 1,
      metalness: 0,
    });
    const rockCount = quality === "low" ? 5 : 9;
    for (let i = 0; i < rockCount; i += 1) {
      const rock = new Mesh(new SphereGeometry(1, 6, 5), rockMat);
      const angle = (i / rockCount) * Math.PI * 2 + 0.4;
      const dist = 18 + (i % 4) * 16;
      const scale = 0.6 + (i % 3) * 0.7;
      rock.scale.set(scale * 1.8, scale * 0.7, scale * 1.3);
      rock.position.set(Math.cos(angle) * dist, scale * 0.2, Math.sin(angle) * dist);
      rock.rotation.y = angle;
      this.surfaceGroup.add(rock);
    }

    const pad = new Mesh(
      new SphereGeometry(1, 20, 12),
      new MeshStandardMaterial({ color: "#8d4a32", roughness: 1, metalness: 0 }),
    );
    pad.scale.set(7.5, 0.08, 7.5);
    pad.position.y = 0.02;
    this.surfaceGroup.add(pad);
  }

  _skyMaterial() {
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color("#120d0c") },
        uHorizon: { value: new Color("#e2a078") },
        uGround: { value: new Color("#a85a3c") },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vDir = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uGround;
        void main() {
          float h = normalize(vDir).y;
          vec3 color = mix(uHorizon, uTop, smoothstep(0.0, 0.62, h));
          color = mix(uGround, color, smoothstep(-0.2, 0.05, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }

  setFade(value) {
    const fade = Math.min(1, Math.max(0, value));
    this.planetGroup.visible = fade > 0.02 && !this.surfaceGroup.visible;
    this.model.traverse((obj) => {
      if (!obj.isMesh) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (!material) return;
        material.transparent = fade < 0.98;
        material.opacity = fade;
        material.depthWrite = fade >= 0.98;
      });
    });
    setAtmosphereFade(this.atmosphere, fade);
  }

  showSurface(show) {
    this.surfaceGroup.visible = show;
    this.planetGroup.visible = !show;
  }

  update(dt, camera) {
    if (!this.surfaceGroup.visible) this.model.rotation.y += dt * 0.01;
    updateAtmosphere(this.atmosphere, camera);
  }
}
