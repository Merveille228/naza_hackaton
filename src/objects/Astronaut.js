import {
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
} from "three";
import { ASSETS, LOOK } from "../assets.js";
import { loadModel } from "./loadModel.js";
import { fitToHeight, prepareMeshes, stripUtilityNodes } from "./gltfTools.js";

export class Astronaut {
  constructor() {
    this.group = new Group();
    this.group.name = "Astronaut";
    this.pivot = new Group();
    this.group.add(this.pivot);
    this.mixer = null;
    this.actions = new Map();
    this.current = null;
    this.usingFallback = false;
    this.time = 0;
  }

  async load(renderer, hooks) {
    try {
      const gltf = await loadModel(ASSETS.astronaut, hooks);
      if (!gltf) return;
      stripUtilityNodes(gltf.scene);
      this.pivot.add(gltf.scene);
      prepareMeshes(this.pivot, renderer);
      this.pivot.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          if (material.name === "material_1") {
            material.roughness = 0.12;
            material.metalness = 0.2;
            material.color?.set("#101820");
          } else {
            material.metalness = Math.min(material.metalness ?? 0.05, 0.18);
            material.roughness = Math.max(material.roughness ?? 0.6, 0.42);
          }
        });
      });
      fitToHeight(this.pivot, LOOK.astronautHeight);
      this.pivot.rotation.y = ASSETS.astronautFacing;

      if (gltf.animations?.length) {
        this.mixer = new AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => {
          const action = this.mixer.clipAction(clip);
          action.setLoop(LoopRepeat, Infinity);
          this.actions.set(clip.name.toLowerCase(), action);
        });
        this.play("idle");
      }
    } catch (error) {
      console.warn("Astronaute indisponible, silhouette de remplacement.", error);
      this.usingFallback = true;
      this._buildFallback();
    }
    this.group.visible = false;
  }

  _buildFallback() {
    const suit = new MeshStandardMaterial({
      color: "#e7edf2",
      roughness: 0.55,
      metalness: 0.12,
    });
    const visor = new MeshStandardMaterial({
      color: "#0d1a24",
      roughness: 0.08,
      metalness: 0.35,
      emissive: "#163044",
      emissiveIntensity: 0.4,
    });
    const torso = new Mesh(new CylinderGeometry(0.28, 0.32, 0.7, 16), suit);
    torso.position.y = 1.05;
    const helmet = new Mesh(new SphereGeometry(0.24, 20, 16), suit);
    helmet.position.y = 1.58;
    const glass = new Mesh(new SphereGeometry(0.16, 16, 12), visor);
    glass.scale.set(0.7, 0.75, 0.7);
    glass.position.set(0, 1.58, 0.12);
    const pack = new Mesh(new CylinderGeometry(0.18, 0.18, 0.48, 10), suit);
    pack.scale.set(1, 1, 0.6);
    pack.position.set(0, 1.08, -0.28);
    this.pivot.add(torso, helmet, glass, pack);
    this.pivot.rotation.y = ASSETS.astronautFacing;
  }

  play(name, { once = false } = {}) {
    if (!this.mixer) return;
    const key = this._match(name);
    if (!key) return;
    const next = this.actions.get(key);
    if (this.current === next) return;
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.35).play();
    this.current?.fadeOut(0.35);
    this.current = next;
  }

  _match(name) {
    const needle = name.toLowerCase();
    if (this.actions.has(needle)) return needle;
    for (const key of this.actions.keys()) {
      if (key.includes(needle)) return key;
    }
    return null;
  }

  update(dt) {
    this.time += dt;
    this.mixer?.update(dt);
    if (this.usingFallback && this.group.visible) {
      this.pivot.position.y = Math.sin(this.time * 1.6) * 0.03;
    }
  }
}
