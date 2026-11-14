"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";

function Outpost() {
  const group = useRef<Group>(null);
  const alert = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.08;
    }
    if (alert.current) {
      const pulse = 0.45 + Math.sin(Date.now() * 0.004) * 0.35;
      const mat = alert.current.material;
      if (!Array.isArray(mat) && "opacity" in mat) {
        mat.transparent = true;
        mat.opacity = pulse;
      }
    }
  });

  const modules = useMemo(
    () =>
      [
        { pos: [0, 0.35, 0] as const, scale: [1.4, 0.7, 1.4] as const, color: "#d8dee9" },
        { pos: [-1.6, 0.25, 0.4] as const, scale: [0.9, 0.5, 0.9] as const, color: "#c5ccd8" },
        { pos: [1.5, 0.2, -0.3] as const, scale: [0.8, 0.4, 0.8] as const, color: "#b7c0cf" },
      ] as const,
    [],
  );

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <group ref={group} position={[0.4, -0.35, 0]}>
        {/* Terrain */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[4.2, 64]} />
          <meshStandardMaterial color="#8a4a2f" roughness={0.95} metalness={0.05} />
        </mesh>

        {/* Habitats */}
        {modules.map((m, i) => (
          <mesh key={i} position={[...m.pos]} castShadow>
            <boxGeometry args={[...m.scale]} />
            <meshStandardMaterial color={m.color} roughness={0.55} metalness={0.25} />
          </mesh>
        ))}

        {/* Solar array */}
        <mesh position={[-2.4, 0.55, -1.1]} rotation={[0.15, 0.4, 0.1]}>
          <boxGeometry args={[1.8, 0.06, 1]} />
          <meshStandardMaterial color="#0b3d91" emissive="#0b3d91" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-2.4, 0.2, -1.1]}>
          <cylinderGeometry args={[0.06, 0.08, 0.4, 8]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>

        {/* Greenhouse dome */}
        <mesh position={[2.1, 0.55, 1.1]}>
          <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#3ddc97"
            transparent
            opacity={0.45}
            emissive="#3ddc97"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Alert beacon */}
        <mesh ref={alert} position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fc3d21" emissive="#fc3d21" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </Float>
  );
}

function Mars() {
  return (
    <mesh position={[-3.2, 1.4, -4]}>
      <sphereGeometry args={[1.35, 48, 48]} />
      <meshStandardMaterial color="#c1440e" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [4.2, 2.4, 5.2], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#05070f"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[6, 8, 4]} intensity={1.35} color="#fff2e8" castShadow />
        <pointLight position={[-4, 2, 2]} intensity={0.6} color="#0b3d91" />
        <pointLight position={[2, 3, 1]} intensity={0.45} color="#fc3d21" />
        <Stars radius={80} depth={40} count={1800} factor={3} saturation={0} fade speed={0.4} />
        <Mars />
        <Outpost />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-space-bg via-space-bg/75 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-space-bg to-transparent"
        aria-hidden
      />
    </div>
  );
}
