/**
 * Ambiance et ronflement des moteurs, synthétisés.
 * Le navigateur ne lance le son qu'après un geste (clic ou touche).
 */
export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.engineGain = null;
    this.filter = null;
    this.master = null;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.2;
    master.connect(ctx.destination);
    this.master = master;

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 52;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    drone.connect(droneGain).connect(master);
    drone.start();

    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 160;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.015;
    noise.connect(filter).connect(engineGain).connect(master);
    noise.start();

    this.filter = filter;
    this.engineGain = engineGain;
    if (ctx.state === "suspended") ctx.resume();
  }

  setEngine(power) {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const amount = Math.max(0, Math.min(1, power));
    this.engineGain.gain.setTargetAtTime(0.012 + amount * 0.16, now, 0.25);
    this.filter.frequency.setTargetAtTime(120 + amount * 380, now, 0.25);
  }

  stop() {
    if (!this.ctx) return;
    this.ctx.close();
    this.ctx = null;
  }
}
