import { AdditiveBlending, BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform vec3 uColor;
  uniform vec3 uCameraPos;
  uniform float uIntensity;
  uniform float uPower;
  void main() {
    vec3 viewDir = normalize(uCameraPos - vWorld);
    float facing = abs(dot(normalize(vNormal), viewDir));
    float fresnel = pow(1.0 - clamp(facing, 0.0, 1.0), uPower);
    float limb = smoothstep(0.0, 0.35, fresnel);
    gl_FragColor = vec4(uColor, fresnel * limb * uIntensity);
  }
`;

export function createAtmosphere(radius, color, intensity, power = 3.1) {
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uCameraPos: { value: new Vector3() },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
  });

  const mesh = new Mesh(new SphereGeometry(radius, 64, 48), material);
  mesh.name = "Atmosphere";
  mesh.userData.baseIntensity = intensity;
  mesh.renderOrder = 2;
  return mesh;
}

export function updateAtmosphere(mesh, camera) {
  if (!mesh) return;
  mesh.material.uniforms.uCameraPos.value.copy(camera.position);
}

export function setAtmosphereFade(mesh, fade) {
  if (!mesh) return;
  const base = mesh.userData.baseIntensity ?? 1;
  mesh.material.uniforms.uIntensity.value = base * fade;
}
