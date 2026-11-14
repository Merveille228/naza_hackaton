import { Vector3 } from "three";

export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.state = {
      x: 0,
      y: 18,
      z: 220,
      lx: 0,
      ly: 0,
      lz: 0,
      fov: 42,
    };
    this.shake = 0;
    this._look = new Vector3();
  }

  apply() {
    const s = this.state;
    const jx = (Math.random() - 0.5) * this.shake;
    const jy = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(s.x + jx, s.y + jy, s.z);
    this._look.set(s.lx, s.ly + jy * 0.35, s.lz);
    this.camera.lookAt(this._look);
    if (Math.abs(this.camera.fov - s.fov) > 0.02) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }
    this.shake *= 0.9;
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }
}
