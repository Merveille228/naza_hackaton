"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { RepeatWrapping, type Group, type Mesh } from "three";
import { POIS } from "@/lib/game/level4Data";
import type { Poi } from "@/lib/game/types";

export interface Travel {
  poiId: string;
  position: [number, number];
}

interface Level4SceneProps {
  doneIds: string[];
  travel: Travel | null;
  onSelect: (poiId: string) => void;
  onArrive: (poiId: string) => void;
}

const TEXTURE_BASE = "/textures/rock029/Rock029_1K-JPG_";
const START: [number, number] = [0, 3.6];
const STOP_DISTANCE = 1.5;

/* ---------- Terrain ---------- */

function Terrain() {
  const textures = useTexture({
    map: `${TEXTURE_BASE}Color.jpg`,
    normalMap: `${TEXTURE_BASE}NormalGL.jpg`,
    roughnessMap: `${TEXTURE_BASE}Roughness.jpg`,
    aoMap: `${TEXTURE_BASE}AmbientOcclusion.jpg`,
  });

  useEffect(() => {
    Object.values(textures).forEach((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(14, 14);
      texture.needsUpdate = true;
    });
  }, [textures]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial {...textures} color="#ffb48f" aoMapIntensity={0.8} />
    </mesh>
  );
}

/* ---------- Rochers (positions fixes, hors points d'intérêt) ---------- */

const ROCKS = Array.from({ length: 30 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 6 + ((i * 37) % 23);
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    scale: 0.3 + ((i * 53) % 10) / 14,
    rotation: i,
  };
}).filter(
  (rock) =>
    Math.hypot(rock.x, rock.z) > 5 &&
    POIS.every((poi) => Math.hypot(rock.x - poi.position[0], rock.z - poi.position[1]) > 3),
);

function Rocks() {
  return (
    <>
      {ROCKS.map((rock, i) => (
        <mesh
          key={i}
          position={[rock.x, rock.scale * 0.4, rock.z]}
          rotation={[rock.rotation, rock.rotation * 2, 0]}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6b3a24" roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

/* ---------- Dôme ---------- */

function Dome() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.2, 2.6, 48]} />
        <meshStandardMaterial color="#b7c0cf" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.2, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#d8dee9"
          transparent
          opacity={0.5}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#c5ccd8" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
}

/* ---------- Astronaute ---------- */

function Astronaut({
  travel,
  onArrive,
}: {
  travel: Travel | null;
  onArrive: (poiId: string) => void;
}) {
  const group = useRef<Group>(null);
  const arrived = useRef(true);

  useEffect(() => {
    arrived.current = travel === null;
  }, [travel]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || !travel || arrived.current) return;
    const dx = travel.position[0] - g.position.x;
    const dz = travel.position[1] - g.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= STOP_DISTANCE) {
      arrived.current = true;
      onArrive(travel.poiId);
      return;
    }
    const step = Math.min(distance - STOP_DISTANCE, delta * 3.2);
    g.position.x += (dx / distance) * step;
    g.position.z += (dz / distance) * step;
    g.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <group ref={group} position={[START[0], 0, START[1]]}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.45, 6, 12]} />
        <meshStandardMaterial color="#e8ecf4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.02, 0.1]}>
        <sphereGeometry args={[0.18, 20, 16]} />
        <meshStandardMaterial color="#d9a441" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, -0.24]}>
        <boxGeometry args={[0.34, 0.45, 0.18]} />
        <meshStandardMaterial color="#b7c0cf" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- Points d'intérêt ---------- */

function PoiMarker({
  poi,
  done,
  onSelect,
}: {
  poi: Poi;
  done: boolean;
  onSelect: () => void;
}) {
  const ring = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = done ? "#3ddc97" : poi.color;

  useFrame((state) => {
    if (ring.current) {
      ring.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.06);
    }
  });

  return (
    <group
      position={[poi.position[0], 0, poi.position[1]]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.9, 1.15, 48]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.75} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Zone de clic plus large, invisible */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 2, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, 2.6, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap bg-black/70 px-2 py-1 font-display text-xs font-semibold tracking-wide text-white">
          {done ? "✓ " : ""}
          {poi.name}
        </div>
      </Html>
    </group>
  );
}

/* ---------- Scène ---------- */

export function Level4Scene({ doneIds, travel, onSelect, onArrive }: Level4SceneProps) {
  return (
    <Canvas camera={{ position: [0, 9, 15], fov: 45 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#8a5438"]} />
      <fog attach="fog" args={["#8a5438", 28, 70]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 14, 6]} intensity={1.6} color="#ffe2c8" />
      <Stars radius={90} depth={30} count={900} factor={3} fade />

      <Suspense fallback={null}>
        <Terrain />
      </Suspense>
      <Rocks />
      <Dome />
      <Astronaut travel={travel} onArrive={onArrive} />
      {POIS.map((poi) => (
        <PoiMarker
          key={poi.id}
          poi={poi}
          done={doneIds.includes(poi.id)}
          onSelect={() => onSelect(poi.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={9}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
