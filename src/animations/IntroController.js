import { CatmullRomCurve3, Matrix4, Quaternion, Vector3 } from "three";
import gsap from "gsap";
import { Earth } from "../objects/Earth.js";
import { Mars } from "../objects/Mars.js";
import { Spaceship } from "../objects/Spaceship.js";
import { Astronaut } from "../objects/Astronaut.js";
import { Stars } from "../effects/Stars.js";
import { Particles } from "../effects/Particles.js";
import { buildIntroTimeline } from "./CameraAnimations.js";

export class IntroController {
  constructor({ scene, camera, cameraManager, lighting, ui, quality, renderer, onComplete }) {
    this.scene = scene;
    this.camera = camera;
    this.cameraManager = cameraManager;
    this.lighting = lighting;
    this.ui = ui;
    this.quality = quality;
    this.renderer = renderer;
    this.onComplete = onComplete;

    this.earth = new Earth(scene);
    this.mars = new Mars(scene);
    this.ship = new Spaceship();
    this.astronaut = new Astronaut();
    this.stars = new Stars(scene, quality);
    this.particles = new Particles(scene, quality);

    this.cam = cameraManager.state;
    this.follow = { x: 0, y: 4, z: 16, lx: 0, ly: 1.4, lz: -4 };
    this.flight = { t: 0 };
    this.descent = { t: 0 };
    this.surfaceAlt = { y: 42 };
    this.earthFade = { v: 0 };
    this.marsFade = { v: 0 };
    this.mode = "manual";
    this.phase = "space";
    this.snapCamera = false;
    this.oriented = false;
    this.landed = false;
    this.ready = false;
    this.alive = true;
    this.done = false;
    this.tl = null;

    this.orbitPoint = new Vector3();
    this.curve = null;
    this.approach = new Vector3();
    this.entry = new Vector3();

    this._camLocal = new Vector3();
    this._lookLocal = new Vector3();
    this._smoothCam = new Vector3();
    this._smoothLook = new Vector3();
    this._tangent = new Vector3();
    this._x = new Vector3();
    this._y = new Vector3();
    this._up = new Vector3(0, 1, 0);
    this._basis = new Matrix4();
    this._desired = new Quaternion();
    this._dustOrigin = new Vector3(0, 0.15, -0.4);
  }

  async preload(onProgress) {
    const weights = { earth: 2, mars: 14, astronaut: 32, ship: 1 };
    const ratio = { earth: 0, mars: 0, astronaut: 0, ship: 0 };
    const labels = {
      earth: "Cartographie de la Terre",
      mars: "Cartographie de Mars",
      astronaut: "Préparation de la combinaison",
      ship: "Assemblage du vaisseau",
    };
    const report = (key, value) => {
      ratio[key] = value;
      const total = Object.values(weights).reduce((sum, n) => sum + n, 0);
      const current = Object.entries(weights).reduce((sum, [name, weight]) => sum + weight * ratio[name], 0);
      onProgress?.(current / total, labels[key]);
    };

    const hooks = (key) => ({
      onProgress: (value) => report(key, value),
      isAlive: () => this.alive && !this.done,
    });

    await Promise.all([
      this.earth.load(this.renderer, hooks("earth")),
      this.mars.load(this.renderer, hooks("mars"), this.quality),
      this.astronaut.load(this.renderer, hooks("astronaut")),
      this.ship.load(this.scene, this.renderer, hooks("ship")),
    ]);

    if (!this.alive || this.done) return false;

    this.ship.group.add(this.astronaut.group);
    this.astronaut.group.position.set(0.28, 0, 0.2);
    this._buildRoute();
    this._placeShip(this.curve.getPoint(0), this.curve.getTangent(0), 1);
    this.oriented = true;
    this.ready = true;
    report("ship", 1);
    return true;
  }

  _buildRoute() {
    const outward = new Vector3(-0.12, 0.34, -1).normalize();
    const orbit = new Vector3(this.earth.radius * 0.22, this.earth.radius * 0.16, this.earth.radius + 18);
    const leave = orbit.clone().add(new Vector3(28, 16, 150));
    const mid = new Vector3(120, 64, 780);
    const far = this.mars.center.clone().addScaledVector(outward, this.mars.radius + 620);
    const approach = this.mars.center.clone().addScaledVector(outward, this.mars.radius + 160);

    this.orbitPoint.copy(orbit);
    this.curve = new CatmullRomCurve3([orbit, leave, mid, far, approach], false, "centripetal", 0.22);
    this.approach.copy(this.curve.getPoint(1));
    const away = this.approach.clone().sub(this.mars.center).normalize();
    this.entry.copy(this.mars.center).addScaledVector(away, this.mars.radius * 1.075);
  }

  play() {
    const er = this.earth.radius;
    Object.assign(this.cam, {
      x: er * 1.1,
      y: er * 0.72,
      z: er * 7.6,
      lx: 0,
      ly: 0,
      lz: 0,
      fov: 46,
    });
    this.stars.setResolution(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
    this.tl = buildIntroTimeline(this);
    const params = new URLSearchParams(window.location.search);
    const speed = Number(params.get("speed"));
    if (speed > 0) this.tl.timeScale(speed);
    const jump = Number(params.get("t"));
    if (jump > 0) this.tl.seek(jump, false);
    this.tl.play();
  }

  revealShip() {
    this.ship.reveal();
  }

  setMode(mode, snap = false) {
    this.mode = mode;
    this.snapCamera = snap;
    if (mode === "follow") {
      this._smoothCam.set(this.cam.x, this.cam.y, this.cam.z);
      this._smoothLook.set(this.cam.lx, this.cam.ly, this.cam.lz);
    }
  }

  cutToSurface() {
    if (this.phase === "surface") return;
    this.phase = "surface";
    this.mars.showSurface(true);
    this.earth.group.visible = false;
    if (this.earth.moon) this.earth.moon.visible = false;
    this.stars.setVisible(false);
    this.particles.setSpaceDustVisible(false);
    this.lighting.setSurface(1);
    this.ship.group.visible = true;
    this.ship.group.position.set(0, this.surfaceAlt.y, 0);
    this.ship.group.quaternion.identity();
    this.setMode("follow", true);
  }

  beginEgress() {
    this.astronaut.group.visible = true;
    const walk = this.astronaut.actions?.size ? "moon_walk" : "idle";
    this.astronaut.play(walk);
    gsap.to(this.astronaut.group.position, {
      x: 2.55,
      y: 0,
      z: 0.32,
      duration: 4.3,
      ease: "power1.inOut",
      onComplete: () => {
        if (this.done) return;
        this.astronaut.play("wave", { once: true });
        gsap.delayedCall(2.2, () => {
          if (!this.done) this.astronaut.play("idle");
        });
      },
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.tl?.kill();
    this.ui.fadeOut(() => {
      if (this.alive) this.onComplete?.();
    });
  }

  update(dt) {
    if (!this.ready) return;

    if (this.phase === "space") {
      const descending = this.descent.t > 0.001;
      const position = descending
        ? this.approach.clone().lerp(this.entry, this._ease(this.descent.t))
        : this.curve.getPoint(Math.min(this.flight.t, 0.9999));
      const tangent = descending
        ? this.entry.clone().sub(this.approach)
        : this.curve.getTangent(Math.min(this.flight.t, 0.9999));
      this._placeShip(position, tangent, dt);
    } else {
      this.ship.group.position.set(0, Math.max(0, this.surfaceAlt.y), 0);
      this.ship.group.quaternion.identity();
      this._dustOrigin.set(0, 0.2, -0.2);
      if (this.surfaceAlt.y < 16 && this.ship.params.engine > 0.12) {
        this.particles.spawnDust(this._dustOrigin, 2, 0.8 + this.ship.params.engine * 1.4);
      }
      if (!this.landed && this.surfaceAlt.y <= 0.05) {
        this.landed = true;
        this.particles.landingBurst(this._dustOrigin);
        this.cameraManager.addShake(0.28);
      }
    }

    if (this.mode === "follow") this._applyFollow(dt);

    this.ship.update(dt);
    this.earth.update(dt, this.camera);
    this.mars.update(dt, this.camera);
    this.astronaut.update(dt);
    this.stars.update(dt, this.camera);
    this.particles.update(dt, this.camera);
    this.ui.setHeat(this.ship.params.heat);
    this.stars.setResolution(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  _placeShip(position, tangent, dt) {
    this.ship.group.position.copy(position);
    this._tangent.copy(tangent);
    if (this._tangent.lengthSq() < 1e-6) return;
    this._tangent.normalize();
    this._x.crossVectors(this._up, this._tangent);
    if (this._x.lengthSq() < 1e-6) this._x.set(1, 0, 0);
    this._x.normalize();
    this._y.crossVectors(this._tangent, this._x).normalize();
    this._basis.makeBasis(this._x, this._y, this._tangent);
    this._desired.setFromRotationMatrix(this._basis);
    const alpha = this.oriented ? 1 - Math.exp(-1.5 * dt) : 1;
    this.ship.group.quaternion.slerp(this._desired, alpha);
    this.oriented = true;
  }

  _applyFollow(dt) {
    const quaternion = this.ship.group.quaternion;
    const origin = this.ship.group.position;
    this._camLocal.set(this.follow.x, this.follow.y, this.follow.z).applyQuaternion(quaternion).add(origin);
    this._lookLocal.set(this.follow.lx, this.follow.ly, this.follow.lz).applyQuaternion(quaternion).add(origin);
    const alpha = this.snapCamera ? 1 : 1 - Math.exp(-1.35 * dt);
    this._smoothCam.lerp(this._camLocal, alpha);
    this._smoothLook.lerp(this._lookLocal, alpha);
    this.snapCamera = false;
    this.cam.x = this._smoothCam.x;
    this.cam.y = this._smoothCam.y;
    this.cam.z = this._smoothCam.z;
    this.cam.lx = this._smoothLook.x;
    this.cam.ly = this._smoothLook.y;
    this.cam.lz = this._smoothLook.z;
  }

  _ease(value) {
    const t = Math.min(1, Math.max(0, value));
    return t * t * (3 - 2 * t);
  }

  dispose() {
    this.alive = false;
    this.done = true;
    this.tl?.kill();
    gsap.killTweensOf(this.astronaut.group.position);
    gsap.killTweensOf(this.ship.group.scale);
    gsap.killTweensOf(this.ship.params);
  }
}
