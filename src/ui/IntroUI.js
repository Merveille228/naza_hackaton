import "./intro.css";

export class IntroUI {
  constructor(container) {
    this.root = document.createElement("div");
    this.root.className = "orbite-intro";
    this.root.innerHTML = `
      <div class="orbite-stage"></div>
      <div class="orbite-letterbox top"></div>
      <div class="orbite-letterbox bottom"></div>
      <div class="orbite-vignette"></div>
      <div class="orbite-heat"></div>
      <div class="orbite-fade"></div>
      <div class="orbite-loader">
        <p class="orbite-kicker">Orbite 3</p>
        <h2>Mise en orbite</h2>
        <p class="orbite-status">Préparation du vaisseau…</p>
        <div class="orbite-bar" aria-hidden="true"><span></span></div>
      </div>
      <button type="button" class="orbite-skip">Passer</button>
      <div class="orbite-titles">
        <p class="eyebrow">Simulation spatiale</p>
        <h1>ORBITe 3</h1>
        <p class="tagline">Votre mission commence maintenant.</p>
        <button type="button" class="orbite-begin">Commencer</button>
      </div>
    `;
    container.appendChild(this.root);
    this.canvasHost = this.root.querySelector(".orbite-stage");
    this.loader = this.root.querySelector(".orbite-loader");
    this.status = this.root.querySelector(".orbite-status");
    this.bar = this.root.querySelector(".orbite-bar span");
    this.heat = this.root.querySelector(".orbite-heat");
    this.fade = this.root.querySelector(".orbite-fade");
    this.titles = this.root.querySelector(".orbite-titles");
    this.skipButton = this.root.querySelector(".orbite-skip");
    this.beginButton = this.root.querySelector(".orbite-begin");
  }

  setProgress(value, label) {
    const amount = Math.max(0, Math.min(1, value));
    this.bar.style.width = `${Math.round(amount * 100)}%`;
    if (label) this.status.textContent = label;
  }

  hideLoader() {
    this.loader.classList.add("is-done");
    this.fade.style.transition = "opacity 1.5s ease";
    requestAnimationFrame(() => {
      this.fade.style.opacity = "0";
    });
  }

  setHeat(value) {
    this.heat.style.opacity = String(Math.max(0, Math.min(1, value)));
  }

  showFinale() {
    this.titles.classList.add("is-on");
  }

  fadeOut(done) {
    this.fade.style.transition = "opacity 0.7s ease";
    this.fade.style.opacity = "1";
    window.setTimeout(done, 720);
  }

  onSkip(handler) {
    this.skipButton.addEventListener("click", handler);
  }

  onBegin(handler) {
    this.beginButton.addEventListener("click", handler);
  }

  dispose() {
    this.root.remove();
  }
}
