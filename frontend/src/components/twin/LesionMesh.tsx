import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface LesionMeshProps {
  length_mm: number;
  width_mm: number;
  depth_mm?: number | null;
  placement_x: number;
  placement_y: number;
  placement_z: number;
  theme: 'light' | 'dark';
  showAnnotation?: boolean;
}

export const LesionMesh: React.FC<LesionMeshProps> = ({
  length_mm,
  width_mm,
  depth_mm,
  placement_x,
  placement_y,
  placement_z,
  theme,
  showAnnotation = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Scaled dimensions relative to illustrative cavity scale (normalized ~10mm = 0.35 units)
  const effectiveDepth = depth_mm && depth_mm > 0 ? depth_mm : width_mm;
  const sx = Math.max(0.09, (length_mm / 10.0) * 0.30);
  const sy = Math.max(0.09, (width_mm / 10.0) * 0.28);
  const sz = Math.max(0.09, (effectiveDepth / 10.0) * 0.28);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      // Subtle gentle respiration pulse (demonstration aesthetic)
      const pulse = 1.0 + Math.sin(t * 1.8) * 0.04;
      glowRef.current.scale.set(sx * 1.25 * pulse, sy * 1.25 * pulse, sz * 1.25 * pulse);
    }
  });

  // BioTrack Restrained Medical Red / Coral
  const lesionColor = '#BD473B';
  const glowColor = '#E0AEB2';

  // Inside cavity placement clamp (ensures polyp stays inside endometrial lumen)
  const clampedX = Math.max(-0.4, Math.min(0.4, placement_x));
  const clampedY = Math.max(-0.2, Math.min(0.65, placement_y));
  const clampedZ = Math.max(-0.06, Math.min(0.06, placement_z));

  return (
    <group
      position={[clampedX, clampedY, clampedZ]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 1. Primary Lesion Mesh (Scaled tri-axial ellipsoid) */}
      <mesh ref={meshRef} scale={[sx, sy, sz]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={lesionColor}
          roughness={0.28}
          metalness={0.15}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
          emissive={lesionColor}
          emissiveIntensity={hovered ? 0.35 : 0.18}
        />
      </mesh>

      {/* 2. Outer Echogenic Selection Halo */}
      <mesh ref={glowRef} scale={[sx * 1.2, sy * 1.2, sz * 1.2]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={glowColor}
          transparent={true}
          opacity={hovered ? 0.45 : 0.22}
          wireframe={true}
        />
      </mesh>

      {/* 3. Fibrovascular Pedicle / Attachment Stalk to Endometrial Cavity Wall */}
      <mesh position={[-sx * 0.45, -sy * 0.35, -0.02]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.028, 0.048, 0.22, 16]} />
        <meshStandardMaterial color="#563843" roughness={0.45} />
      </mesh>

      {/* 4. 3D Anatomical Spatial Callout Tag */}
      {showAnnotation && (
        <Html position={[sx + 0.18, sy + 0.08, 0]} center distanceFactor={8}>
          <div className="pointer-events-none select-none transition-all duration-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#1F1B22]/95 backdrop-blur-md border border-[#E5DFDF] dark:border-[#3D3342] shadow-lg text-[10px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BD473B] animate-pulse" />
              <span className="font-bold text-[#040304] dark:text-[#F8F6F6]">
                Polyp: {length_mm.toFixed(1)} × {width_mm.toFixed(1)} mm
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
