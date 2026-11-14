import { AmbientLight, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, SphereGeometry } from "three";

export function createLighting(scene) {
  const sunPosition = { x: -2400, y: 980, z: -720 };

  const sun = new DirectionalLight("#fff3e4", 2.55);
  sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
  sun.castShadow = false;

  const ambient = new AmbientLight("#8ea4c8", 0.22);
  const hemi = new HemisphereLight("#c9d7ef", "#1a120c", 0.38);

  const sunMesh = new Mesh(
    new SphereGeometry(46, 24, 16),
    new MeshBasicMaterial({ color: "#fffaf2" }),
  );
  sunMesh.position.copy(sun.position);
  sunMesh.frustumCulled = false;

  scene.add(sun, sun.target, ambient, hemi, sunMesh);

  return {
    sun,
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
