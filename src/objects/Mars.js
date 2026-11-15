import {
  BackSide,
  CanvasTexture,
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "three";
import { ASSETS, LOOK } from "../assets.js";
import { loadModel } from "./loadModel.js";
import { fitToHeight, fitToRadius, prepareMeshes, stripUtilityNodes } from "./gltfTools.js";

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

function loadRepeatTexture(url, colorSpace) {
  const loader = new TextureLoader();
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(26, 26);
        if (colorSpace) texture.colorSpace = SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

async function loadRockTextures() {
  const base = "/textures/rock029/Rock029_1K-JPG_";
  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([
    loadRepeatTexture(`${base}Color.jpg`, true),
    loadRepeatTexture(`${base}NormalGL.jpg`, false),
    loadRepeatTexture(`${base}Roughness.jpg`, false),
    loadRepeatTexture(`${base}AmbientOcclusion.jpg`, false),
  ]);
  return { map, normalMap, roughnessMap, aoMap };
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
    this.planetGroup.position.set(0, 0, 0);

    try {
      const gltf = await loadModel(ASSETS.mars, hooks);
      if (!gltf) return;
      stripUtilityNodes(gltf.scene);
      this.model.add(gltf.scene);
      prepareMeshes(this.model, renderer);
      this.model.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        obj.frustumCulled = false;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          if (!material) return;
          if (material.map && !this.albedo) this.albedo = material.map;
          material.color.set("#ffffff");
          material.roughness = 0.92;
          material.metalness = 0.02;
          material.emissive = new Color("#000000");
          material.emissiveIntensity = 0;
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          material.alphaTest = 0;
        });
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

    this.rockTextures = await loadRockTextures();
    try {
      const rockGltf = await loadModel(ASSETS.rock, { isAlive: hooks.isAlive });
      this.rockTemplate = rockGltf?.scene || null;
      if (this.rockTemplate) prepareMeshes(this.rockTemplate, renderer);
    } catch (error) {
      console.warn("Rocher indisponible.", error);
      this.rockTemplate = null;
    }
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

    geometry.setAttribute("uv2", geometry.getAttribute("uv"));
    const rock = this.rockTextures;
    const terrain = new Mesh(
      geometry,
      new MeshStandardMaterial({
        map: rock?.map || null,
        normalMap: rock?.normalMap || null,
        roughnessMap: rock?.roughnessMap || null,
        aoMap: rock?.aoMap || null,
        color: "#ffffff",
        roughness: rock?.roughnessMap ? 1 : 0.96,
        metalness: 0,
        aoMapIntensity: 0.8,
        normalScale: new Vector2(1.5, 1.5),
      }),
    );
    terrain.name = "Terrain";
    this.surfaceGroup.add(terrain);

    const sky = new Mesh(new SphereGeometry(520, 32, 20), this._skyMaterial());
    sky.name = "MarsSky";
    sky.renderOrder = -2;
    this.surfaceGroup.add(sky);

    if (this.rockTemplate) {
      const spots = [
        [5.4, 2.6, 0.7],
        [-6.2, 3.4, 1.1],
        [3.2, -6.8, 0.55],
        [-4.8, -5.2, 1.4],
        [8.6, -1.4, 0.9],
        [-8.2, -1.1, 0.4],
      ];
      spots.forEach(([x, z, height], index) => {
        const pebble = this.rockTemplate.clone(true);
        fitToHeight(pebble, height);
        pebble.position.set(x, 0, z);
        pebble.rotation.y = index * 1.17;
        this.surfaceGroup.add(pebble);
      });
    }

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
  }

  showSurface(show) {
    this.surfaceGroup.visible = show;
    this.planetGroup.visible = !show;
  }

  update(dt) {
    if (!this.surfaceGroup.visible) this.model.rotation.y += dt * 0.01;
  }
}
