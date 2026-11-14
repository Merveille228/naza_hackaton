import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  Vector3,
} from "three";
import gsap from "gsap";

export class Particles {
  constructor(scene, quality) {
    this.scene = scene;
    const motes = quality === "low" ? 70 : 140;
    const dustCount = quality === "low" ? 140 : 240;

    this.sprite = Particles.circleTexture();
    this.motes = this._makePoints(motes, 0.22, "#d5e2ff", 0.45);
    scene.add(this.motes.points);

    this.dust = this._makeDust(dustCount);
    scene.add(this.dust.points);

    this.shock = new Mesh(
      new RingGeometry(0.7, 1.15, 48),
      new MeshBasicMaterial({
        color: "#ead7c4",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.visible = false;
    scene.add(this.shock);

    this._tmp = new Vector3();
  }

  _makePoints(count, size, color, opacity) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color,
      size,
      map: this.sprite,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    return { points: new Points(geometry, material), geometry };
  }

  _makeDust(count) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: "#e7b08a",
      size: 0.55,
      map: this.sprite,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new Points(geometry, material);
    points.frustumCulled = false;
    points.visible = false;
    return { points, geometry, positions, velocities, life, count };
  }

  update(dt, camera) {
    const motePos = this.motes.geometry.attributes.position;
    const array = motePos.array;
    for (let i = 0; i < array.length; i += 3) {
      array[i + 2] -= dt * 0.6;
      const dx = array[i] - camera.position.x;
      const dy = array[i + 1] - camera.position.y;
      const dz = array[i + 2] - camera.position.z;
      if (dx > 35) array[i] -= 70;
      if (dx < -35) array[i] += 70;
      if (dy > 20) array[i + 1] -= 40;
      if (dy < -20) array[i + 1] += 40;
      if (dz > 35) array[i + 2] -= 70;
      if (dz < -35) array[i + 2] += 70;
    }
    motePos.needsUpdate = true;

    if (!this.dust.points.visible) return;
    const { positions, velocities, life, count } = this.dust;
    let alive = 0;
    for (let i = 0; i < count; i += 1) {
      if (life[i] <= 0) continue;
      alive += 1;
      life[i] -= dt;
      velocities[i * 3 + 1] -= 1.5 * dt;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      if (positions[i * 3 + 1] < 0.05) {
        positions[i * 3 + 1] = 0.05;
        velocities[i * 3 + 1] *= -0.25;
        velocities[i * 3] *= 0.7;
        velocities[i * 3 + 2] *= 0.7;
      }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.points.material.opacity = alive > 0 ? 0.75 : 0;
    if (alive === 0) this.dust.points.visible = false;
  }

  setSpaceDustVisible(visible) {
    this.motes.points.visible = visible;
  }

  spawnDust(origin, amount, upward) {
    const { positions, velocities, life, count } = this.dust;
    this.dust.points.visible = true;
    let spawned = 0;
    for (let i = 0; i < count && spawned < amount; i += 1) {
      if (life[i] > 0) continue;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.4;
      positions[i * 3] = origin.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = origin.y + Math.random() * 0.3;
      positions[i * 3 + 2] = origin.z + Math.sin(angle) * radius;
      const speed = 1.2 + Math.random() * 3.4;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = upward * (0.6 + Math.random());
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
      life[i] = 0.8 + Math.random() * 1.6;
      spawned += 1;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  static circleTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new CanvasTexture(canvas);
  }

  landingBurst(origin) {
    this.spawnDust(origin, 180, 2.4);
    this.shock.visible = true;
    this.shock.position.set(origin.x, 0.08, origin.z);
    this.shock.scale.setScalar(1);
    this.shock.material.opacity = 0.5;
    gsap.killTweensOf(this.shock.scale);
    gsap.killTweensOf(this.shock.material);
    gsap.to(this.shock.scale, { x: 18, y: 18, z: 18, duration: 2.6, ease: "power2.out" });
    gsap.to(this.shock.material, {
      opacity: 0,
      duration: 2.6,
      ease: "power2.out",
      onComplete: () => {
        this.shock.visible = false;
      },
    });
  }
}
