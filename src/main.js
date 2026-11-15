import { SceneManager } from "./scene/SceneManager.js";
import { CameraManager } from "./scene/CameraManager.js";
import { createLighting } from "./scene/Lighting.js";
import { IntroUI } from "./ui/IntroUI.js";
import { IntroController } from "./animations/IntroController.js";
import { SpaceAudio } from "./audio/SpaceAudio.js";

/**
 * Point d'entrée de l'introduction. À lancer depuis le client uniquement.
 * Retourne une fonction de nettoyage (WebGL, GSAP, écouteurs).
 */
export function mountIntro(container, { onComplete } = {}) {
  const ui = new IntroUI(container);
  const scenes = new SceneManager(ui.canvasHost);
  const cameraManager = new CameraManager(scenes.camera);
  const lighting = createLighting(scenes.scene);
  const audio = new SpaceAudio();
  const unlockAudio = () => audio.start();
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  const controller = new IntroController({
    scene: scenes.scene,
    camera: scenes.camera,
    cameraManager,
    lighting,
    ui,
    quality: scenes.quality,
    renderer: scenes.renderer,
    onComplete,
  });

  let frame = 0;
  let running = true;
  let last = performance.now();
  let surfaceReady = false;

  const loop = (now) => {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    controller.update(dt);
    audio.setEngine(controller.ship.params.engine);
    if (controller.phase === "surface" && !surfaceReady) {
      surfaceReady = true;
      scenes.setSurfaceBackground(controller.mars.fog);
    }
    cameraManager.apply();
    scenes.render();
  };

  const onKey = (event) => {
    if (event.code !== "Space" && event.code !== "Escape") return;
    event.preventDefault();
    controller.finish();
  };

  window.addEventListener("keydown", onKey);
  ui.onSkip(() => controller.finish());
  ui.onBegin(() => controller.finish());

  controller
    .preload((value, label) => ui.setProgress(value, label))
    .then((ok) => {
      if (!ok || !running) return;
      ui.hideLoader();
      audio.start();
      controller.play();
      last = performance.now();
      frame = requestAnimationFrame(loop);
    })
    .catch((error) => {
      console.error(error);
      ui.setProgress(1, "Chargement interrompu — poursuite de la mission");
      controller.finish();
    });

  return function dispose() {
    running = false;
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    audio.stop();
    controller.dispose();
    scenes.dispose();
    ui.dispose();
  };
}
