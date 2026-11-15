import { Vector3 } from "three";
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
    this.pose = { x: 0, y: 5.2, z: 40, s: 0.08 };
    this.rig = { swing: 0, yaw: 1 };
    this.swingFrom = { x: 0, y: 10, z: 80 };
    this.black = { v: 0 };
    this.camLock = "free";
    this.surfaceAlt = { y: 5 };
    this.earthFade = { v: 0 };
    this.marsFade = { v: 0 };
    this.phase = "space";
    this.landed = false;
    this.ready = false;
    this.alive = true;
    this.done = false;
    this.tl = null;

    this._dustOrigin = new Vector3(0, 0.25, -1.6);
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
    this.astronaut.group.visible = false;
    this._buildRoute();
    this.ship.group.position.set(this.pose.x, this.pose.y, this.pose.z);
    this.ship.group.scale.setScalar(this.pose.s);
    this.ship.group.quaternion.identity();
    this.ready = true;
    report("ship", 1);
    return true;
  }

  _buildRoute() {
    const er = this.earth.radius;
    this.pose.z = er + 2;
    this.mars.planetGroup.position.set(0, 0, 720);
  }

  play() {
    const er = this.earth.radius;
    Object.assign(this.cam, {
      x: er * 0.2,
      y: er * 0.46,
      z: er * 3.15,
      lx: 0,
      ly: er * 0.04,
      lz: 0,
      fov: 42,
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

  setCamLock(lock) {
    this.camLock = lock;
  }

  startSwing() {
    this.swingFrom.x = this.cam.x;
    this.swingFrom.y = this.cam.y;
    this.swingFrom.z = this.cam.z;
    this.rig.swing = 0;
    this.rig.yaw = 1;
    this.camLock = "swing";
    this.revealMars();
  }

  revealMars() {
    this.marsFade.v = 1;
    this.mars.setFade(1);
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
    this.astronaut.group.visible = false;
    this.camLock = "free";
    this._placeOnSurface();
  }

  beginEgress() {
    this.astronaut.group.visible = true;
    this.astronaut.group.position.set(1.05, 0, 0.15);
    const walk = this.astronaut.actions?.size ? "moon_walk" : "idle";
    this.astronaut.play(walk);
    gsap.to(this.astronaut.group.position, {
      x: 4.2,
      y: 0,
      z: 0.9,
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
      this.ship.group.position.set(this.pose.x, this.pose.y, this.pose.z);
      this.ship.group.scale.setScalar(Math.max(0.04, this.pose.s));
      this.ship.group.quaternion.identity();
      if (this.camLock === "swing" || this.camLock === "fly") this.revealMars();
      if (this.camLock === "swing") {
        const t = this.rig.swing;
        this.cam.x = this.swingFrom.x + (this.pose.x + 24 - this.swingFrom.x) * t;
        this.cam.y = this.swingFrom.y + (this.pose.y + 3.4 - this.swingFrom.y) * t;
        this.cam.z = this.swingFrom.z + (this.pose.z - this.swingFrom.z) * t;
        this.cam.lx = this.pose.x;
        this.cam.ly = this.pose.y;
        this.cam.lz = this.pose.z;
      } else if (this.camLock === "fly") {
        const yaw = this.rig.yaw;
        const side = Math.sin(yaw * Math.PI * 0.5);
        const back = Math.cos(yaw * Math.PI * 0.5);
        this.cam.x = this.pose.x + side * 24;
        this.cam.y = this.pose.y + 3.4;
        this.cam.z = this.pose.z - back * 18;
        const mars = this.mars.planetGroup.position;
        this.cam.lx = this.pose.x * yaw + mars.x * (1 - yaw);
        this.cam.ly = this.pose.y * yaw + mars.y * (1 - yaw);
        this.cam.lz = this.pose.z * yaw + mars.z * (1 - yaw);
      }
    } else {
      this._placeOnSurface();
      this._dustOrigin.set(0, 0.25, -1.6);
      if (!this.landed && this.surfaceAlt.y < 16 && this.surfaceAlt.y > 0.15 && this.ship.params.engine > 0.12) {
        this.particles.spawnDust(this._dustOrigin, 2, 0.8 + this.ship.params.engine * 1.4);
      }
      if (!this.landed && this.surfaceAlt.y <= 0.05) {
        this.landed = true;
        this.particles.landingBurst(this._dustOrigin);
        this.cameraManager.addShake(0.28);
      }
    }

    this.ship.update(dt);
    this.earth.update(dt, this.camera);
    this.mars.update(dt, this.camera);
    this.astronaut.update(dt);
    this.stars.update(dt, this.camera);
    this.particles.update(dt, this.camera);
    this.ui.setHeat(this.ship.params.heat);
    this.stars.setResolution(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  _placeOnSurface() {
    this.ship.group.quaternion.identity();
    this.ship.group.scale.setScalar(1);
    this.ship.group.position.set(0, Math.max(0, this.surfaceAlt.y), 0);
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
