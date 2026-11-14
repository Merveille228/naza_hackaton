import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Points,
  PointsMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from "three";
import gsap from "gsap";
import { ASSETS, LOOK } from "../assets.js";
import { loadModel } from "./loadModel.js";
import { fitToLength, prepareMeshes, stripUtilityNodes } from "./gltfTools.js";

function metal(color, roughness, metalness, extras = {}) {
  return new MeshStandardMaterial({ color, roughness, metalness, ...extras });
}

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.5)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class Spaceship {
  constructor() {
    this.group = new Group();
    this.group.name = "Spaceship";
    this.params = { engine: 0, heat: 0, hatch: 0 };
    this.hatchPivot = null;
    this.rampPivot = null;
    this.plumes = [];
    this.embers = null;
    this.emberPositions = null;
    this.emberBase = -2.7;
    this.engineLight = null;
    this.noseGlow = null;
    this.nav = [];
    this.shadow = null;
    this.time = 0;
    this.usingFallback = true;
  }

  async load(scene, renderer, hooks) {
    scene.add(this.group);
    if (ASSETS.spaceship) {
      try {
        const gltf = await loadModel(ASSETS.spaceship, hooks);
        if (gltf) {
          stripUtilityNodes(gltf.scene);
          const holder = new Group();
          holder.add(gltf.scene);
          prepareMeshes(holder, renderer);
          fitToLength(holder, LOOK.shipLength);
          this.group.add(holder);
          this.usingFallback = false;
        }
      } catch (error) {
        console.warn("Vaisseau GLB indisponible, lander de remplacement.", error);
      }
    }
    if (this.usingFallback) this._buildProcedural();
    this._buildEffects();
    this.group.visible = false;
  }

  _add(mesh) {
    this.group.add(mesh);
    return mesh;
  }

  _buildProcedural() {
    const white = metal("#c9d0da", 0.58, 0.22);
    const panel = metal("#2c3442", 0.4, 0.62);
    const foil = metal("#a78455", 0.32, 0.78);
    const dark = metal("#14181f", 0.38, 0.84);
    const solar = metal("#10284a", 0.28, 0.55, {
      emissive: "#1c4f96",
      emissiveIntensity: 0.45,
      side: DoubleSide,
    });

    const body = new Mesh(new CylinderGeometry(1.02, 1.12, 3.5, 24), white);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 1.48, 0.05);
    this._add(body);

    const nose = new Mesh(new SphereGeometry(1.02, 28, 20), white);
    nose.scale.set(1, 0.9, 1.18);
    nose.position.set(0, 1.52, 1.95);
    this._add(nose);

    const cockpit = new Mesh(
      new SphereGeometry(0.46, 20, 16),
      metal("#07131d", 0.08, 0.2, { emissive: "#14324a", emissiveIntensity: 0.35 }),
    );
    cockpit.scale.set(1.15, 0.72, 1);
    cockpit.position.set(0, 2.05, 2.35);
    this._add(cockpit);

    const belly = new Mesh(new BoxGeometry(1.7, 0.16, 2.4), foil);
    belly.position.set(0, 0.62, 0.1);
    this._add(belly);

    const tail = new Mesh(new CylinderGeometry(0.78, 0.92, 1.1, 20), panel);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 1.38, -2.05);
    this._add(tail);

    const nozzleGeo = new CylinderGeometry(0.22, 0.42, 0.62, 16, 1, true);
    [-0.42, 0.42].forEach((x) => {
      const nozzle = new Mesh(nozzleGeo, dark);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(x, 1.05, -2.55);
      this._add(nozzle);
    });

    const legGeo = new CylinderGeometry(0.05, 0.07, 1.15, 8);
    const footGeo = new CylinderGeometry(0.22, 0.26, 0.06, 12);
    [
      [1.15, 1.15],
      [-1.15, 1.15],
      [1.15, -1.2],
      [-1.15, -1.2],
    ].forEach(([x, z]) => {
      const leg = new Mesh(legGeo, panel);
      leg.position.set(x, 0.58, z);
      leg.rotation.z = x > 0 ? -0.18 : 0.18;
      this._add(leg);
      const foot = new Mesh(footGeo, dark);
      foot.position.set(x * 1.08, 0.04, z);
      this._add(foot);
    });

    [-1, 1].forEach((side) => {
      const frame = new Mesh(new BoxGeometry(3.3, 0.05, 1.15), panel);
      frame.position.set(side * 2.65, 2.2, -1.2);
      frame.rotation.z = side > 0 ? -0.35 : 0.35;
      this._add(frame);
      const cells = new Mesh(new BoxGeometry(3.05, 0.03, 0.95), solar);
      cells.position.set(side * 2.65, 2.24, -1.2);
      cells.rotation.z = frame.rotation.z;
      this._add(cells);
    });

    const mast = new Mesh(new CylinderGeometry(0.025, 0.025, 0.9, 8), panel);
    mast.position.set(0, 2.45, -1.3);
    this._add(mast);
    const dish = new Mesh(new SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), foil);
    dish.position.set(0, 2.9, -1.3);
    this._add(dish);

    const hatchFrame = new Mesh(new BoxGeometry(0.08, 1.15, 0.78), dark);
    hatchFrame.position.set(1.05, 1.42, 0.25);
    this._add(hatchFrame);

    this.hatchPivot = new Group();
    this.hatchPivot.name = "Hatch";
    this.hatchPivot.position.set(1.1, 1.42, 0.25);
    const door = new Mesh(new BoxGeometry(0.05, 1.12, 0.74), white);
    door.position.x = 0.03;
    this.hatchPivot.add(door);
    this.group.add(this.hatchPivot);

    this.rampPivot = new Group();
    this.rampPivot.position.set(1.08, 0.78, 0.25);
    const ramp = new Mesh(new BoxGeometry(1.15, 0.05, 0.68), panel);
    ramp.position.set(0.58, -0.02, 0);
    this.rampPivot.add(ramp);
    this.group.add(this.rampPivot);

    const stripe = new Mesh(
      new BoxGeometry(0.08, 0.02, 3.1),
      metal("#c4372a", 0.5, 0.2),
    );
    stripe.position.set(0.55, 2.28, 0.2);
    this._add(stripe);

    this.nav.push(this._navLight(1.2, 1.7, 1.6, "#ff3b30"));
    this.nav.push(this._navLight(-1.2, 1.7, 1.6, "#3ddc6a"));

    this.noseGlow = new Mesh(
      new SphereGeometry(1.08, 24, 16),
      new MeshBasicMaterial({
        color: "#ff6a2a",
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.noseGlow.scale.set(1, 0.9, 1.2);
    this.noseGlow.position.set(0, 1.52, 2.05);
    this._add(this.noseGlow);
  }

  _navLight(x, y, z, color) {
    const mesh = new Mesh(new SphereGeometry(0.06, 10, 10), new MeshBasicMaterial({ color }));
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }

  _buildEffects() {
    const plumeMat = new MeshBasicMaterial({
      color: "#ffb15a",
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const coreMat = plumeMat.clone();
    coreMat.color.set("#fff4dd");

    const rear = this.usingFallback ? -2.7 : -LOOK.shipLength * 0.48;
    const height = this.usingFallback ? 1.05 : 1.2;
    [-0.42, 0.42].forEach((x) => {
      const plume = new Mesh(new ConeGeometry(0.38, 2.8, 16, 1, true), plumeMat.clone());
      plume.rotation.x = Math.PI / 2;
      plume.position.set(this.usingFallback ? x : x * 0.35, height, rear - 1.2);
      const core = new Mesh(new ConeGeometry(0.16, 1.6, 12, 1, true), coreMat.clone());
      core.rotation.x = Math.PI / 2;
      core.position.copy(plume.position);
      this.group.add(plume, core);
      this.plumes.push(plume, core);
    });

    this.engineLight = new PointLight("#ffb060", 0, 16, 2);
    this.engineLight.position.set(0, height, rear);
    this.group.add(this.engineLight);

    const count = 80;
    const positions = new Float32Array(count * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    this.emberPositions = positions;
    this.emberBase = rear;
    this.embers = new Points(
      geometry,
      new PointsMaterial({
        color: "#ffc48a",
        size: 0.18,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    for (let i = 0; i < count; i += 1) this._resetEmber(i, true);
    this.group.add(this.embers);

    this.shadow = new Mesh(
      new SphereGeometry(1, 12, 8),
      new MeshBasicMaterial({
        map: shadowTexture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(4.4, 4.4, 1);
    this.shadow.position.y = 0.04;
    this.shadow.visible = false;
    this.group.add(this.shadow);
  }

  _resetEmber(index, randomZ) {
    const i = index * 3;
    this.emberPositions[i] = (Math.random() - 0.5) * 0.8;
    this.emberPositions[i + 1] = 0.9 + Math.random() * 0.45;
    this.emberPositions[i + 2] = this.emberBase - (randomZ ? Math.random() * 3.2 : 0);
  }

  reveal() {
    this.group.visible = true;
    this.group.scale.setScalar(0.94);
    gsap.to(this.group.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "power2.out" });
  }

  update(dt) {
    this.time += dt;
    const power = this.params.engine;
    const flicker = 0.86 + Math.sin(this.time * 43) * 0.08 + Math.sin(this.time * 97) * 0.05;

    this.plumes.forEach((plume, index) => {
      const outer = index % 2 === 0;
      const width = 0.4 + power * (outer ? 0.85 : 0.45);
      const length = (0.25 + power * (outer ? 1.35 : 0.9)) * flicker;
      plume.scale.set(width, length, width);
      plume.material.opacity = power * (outer ? 0.45 : 0.9);
      plume.visible = power > 0.02;
    });
    if (this.engineLight) this.engineLight.intensity = power * 8 * flicker;

    if (this.embers) {
      this.embers.visible = power > 0.05 || this.params.heat > 0.2;
      this.embers.material.opacity = Math.max(power * 0.75, this.params.heat * 0.4);
      for (let i = 0; i < this.emberPositions.length / 3; i += 1) {
        this.emberPositions[i * 3 + 2] -= dt * (6 + power * 12);
        if (this.emberPositions[i * 3 + 2] < this.emberBase - 4.4) this._resetEmber(i, false);
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }

    if (this.noseGlow) this.noseGlow.material.opacity = this.params.heat * 0.55;
    if (this.hatchPivot) this.hatchPivot.rotation.y = -this.params.hatch * 1.85;
    if (this.rampPivot) this.rampPivot.rotation.z = this.params.hatch * 0.72;

    const blink = Math.sin(this.time * 3.4) > 0.15 ? 1 : 0.2;
    this.nav.forEach((light) => light.scale.setScalar(0.7 + blink));
    if (this.shadow) {
      this.shadow.visible = this.group.position.y < 12;
      this.shadow.material.opacity = Math.max(0, 0.55 - this.group.position.y * 0.04);
    }
  }
}
