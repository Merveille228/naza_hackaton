import { AmbientLight, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, SphereGeometry } from "three";

export function createLighting(scene) {
  const sunPosition = { x: 900, y: 1600, z: 700 };

  const sun = new DirectionalLight("#fff6ee", 2.8);
  sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
  sun.castShadow = false;

  // Éclaire la face de Mars que le vaisseau approche, pour ne pas foncer vers un disque noir.
  const approachFill = new DirectionalLight("#ffe8d4", 1.35);
  approachFill.position.set(0, 400, -2200);

  const ambient = new AmbientLight("#c5d0e4", 0.48);
  const hemi = new HemisphereLight("#e7eef8", "#2a211c", 0.45);

  const sunMesh = new Mesh(
    new SphereGeometry(46, 24, 16),
    new MeshBasicMaterial({ color: "#fffaf2" }),
  );
  sunMesh.position.copy(sun.position);
  sunMesh.frustumCulled = false;

  scene.add(sun, sun.target, approachFill, approachFill.target, ambient, hemi, sunMesh);

  return {
    sun,
    approachFill,
    ambient,
    hemi,
    sunMesh,
    setSurface(blend) {
      const t = Math.min(1, Math.max(0, blend));
      sun.intensity = 2.55 + t * 0.35;
      sun.color.set(new Color("#fff3e4").lerp(new Color("#ffd2b0"), t));
      ambient.intensity = 0.22 + t * 0.12;
      ambient.color.set(new Color("#8ea4c8").lerp(new Color("#c4896a"), t));
      hemi.color.set(new Color("#c9d7ef").lerp(new Color("#f0c2a4"), t));
      hemi.groundColor.set(new Color("#1a120c").lerp(new Color("#6a311c"), t));
      hemi.intensity = 0.38 + t * 0.22;
      sunMesh.visible = t < 0.5;
    },
  };
}
