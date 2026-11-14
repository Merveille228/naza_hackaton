import { BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector2, Vector3 } from "three";

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.72 + 0.28 * sin(uTime * (0.45 + aSeed * 1.6) + aSeed * 30.0);
    gl_PointSize = clamp(aSize * twinkle * uPixelRatio * (260.0 / max(1.0, -mv.z)), 0.4, 3.8);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uStreak;
  uniform vec2 uResolution;
  varying float vSeed;
  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    vec2 screen = gl_FragCoord.xy / uResolution - vec2(0.5);
    float screenLen = length(screen) + 0.0001;
    vec2 radial = screen / screenLen;
    float along = dot(p, radial);
    float stretch = 1.0 + uStreak * (2.2 + screenLen * 3.5);
    vec2 perp = p - radial * along;
    float d = length(vec2(along / stretch, perp));
    float alpha = smoothstep(0.5, 0.08, d);
    if (alpha < 0.02) discard;
    vec3 warm = vec3(1.0, 0.93, 0.84);
    vec3 cool = vec3(0.78, 0.86, 1.0);
    vec3 color = mix(cool, warm, vSeed);
    gl_FragColor = vec4(color, alpha * (0.55 + vSeed * 0.45));
  }
`;

export class Stars {
  constructor(scene, quality) {
    const count = quality === "low" ? 1800 : 3800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const dir = new Vector3();

    for (let i = 0; i < count; i += 1) {
      dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      if (dir.lengthSq() < 0.0001) dir.set(0, 1, 0);
      dir.normalize();
      const radius = 1900 + Math.random() * 1400;
      positions[i * 3] = dir.x * radius;
      positions[i * 3 + 1] = dir.y * radius;
      positions[i * 3 + 2] = dir.z * radius;
      const bright = Math.random() > 0.92;
      sizes[i] = bright ? 2.4 + Math.random() * 1.6 : 0.7 + Math.random() * 1.1;
      seeds[i] = Math.random();
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

    this.streak = { value: 0 };
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uStreak: this.streak,
        uResolution: { value: new Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -1;
    scene.add(this.points);
    this.time = 0;
  }

  setResolution(width, height, pixelRatio) {
    this.material.uniforms.uResolution.value.x = width;
    this.material.uniforms.uResolution.value.y = height;
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  update(dt, camera) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    this.points.position.copy(camera.position);
    this.points.rotation.y = this.time * 0.004;
  }

  setVisible(visible) {
    this.points.visible = visible;
  }
}
