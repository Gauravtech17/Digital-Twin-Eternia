import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface HolographicLesionProps {
  length_mm: number;
  width_mm: number;
  depth_mm?: number | null;
  placement_x?: number;
  placement_y?: number;
  placement_z?: number;
  showAnnotation?: boolean;
  highlighted?: boolean;
  pulseSpeed?: number;
}

export const HolographicLesion: React.FC<HolographicLesionProps> = ({
  length_mm,
  width_mm,
  depth_mm,
  placement_x = 0.18,
  placement_y = 0.38,
  placement_z = -0.02,
  showAnnotation = true,
  highlighted = false,
  pulseSpeed = 1.8,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Scaled dimensions relative to cavity coordinate space (~10mm = 0.28 units)
  const effectiveDepth = depth_mm && depth_mm > 0 ? depth_mm : width_mm;
  const sx = Math.max(0.08, (length_mm / 10.0) * 0.28);
  const sy = Math.max(0.08, (width_mm / 10.0) * 0.25);
  const sz = Math.max(0.08, (effectiveDepth / 10.0) * 0.24);

  // Gentle organic breathing pulse
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      const speed = highlighted ? 3.8 : pulseSpeed;
      const pulse = 1.0 + Math.sin(t * speed) * (highlighted ? 0.14 : 0.06);
      glowRef.current.scale.set(sx * 1.3 * pulse, sy * 1.3 * pulse, sz * 1.3 * pulse);
    }
  });

  // Clamp inside endometrial cavity lumen coordinates
  const clampedX = Math.max(-0.35, Math.min(0.35, placement_x));
  const clampedY = Math.max(-0.15, Math.min(0.65, placement_y));
  const clampedZ = Math.max(-0.06, Math.min(0.06, placement_z));

  // Reference Coral-Pink Colors (Matches image target)
  const coralPink = '#FA727A';
  const coralEmissive = '#D64552';
  const coralHalo = '#FF9EAA';

  return (
    <group
      position={[clampedX, clampedY, clampedZ]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 1. Primary Lobulated Coral Lesion Mesh */}
      <mesh ref={meshRef} scale={[sx, sy, sz]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={coralPink}
          emissive={coralEmissive}
          emissiveIntensity={highlighted || hovered ? 0.55 : 0.28}
          roughness={0.28}
          metalness={0.06}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* 2. Soft Coral Halo / Glow (Smooth translucent glow, NO wireframe) */}
      <mesh ref={glowRef} scale={[sx * 1.25, sy * 1.25, sz * 1.25]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={coralHalo}
          transparent={true}
          opacity={highlighted || hovered ? 0.45 : 0.20}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Reticle Target Ring on Polyp (as seen in Reference Image) */}
      <mesh position={[0, 0, sz * 1.05]}>
        <ringGeometry args={[0.045, 0.055, 32]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent={true}
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, sz * 1.05]}>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 4. Fibrovascular Pedicle Stalk Anchoring into Cavity Wall */}
      <mesh
        position={[-sx * 0.45, -sy * 0.35, -0.04]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <cylinderGeometry args={[0.028, 0.048, 0.22, 16]} />
        <meshStandardMaterial
          color="#C95362"
          roughness={0.4}
        />
      </mesh>

      {/* 5. Minimalist Glassmorphic Callout Tag (Directly matching Reference Image) */}
      {showAnnotation && (
        <Html position={[sx + 0.35, sy + 0.02, 0]} center distanceFactor={6.8}>
          <div className="pointer-events-none select-none transition-all duration-300 flex items-center">
            {/* Fine White Diagonal Tether Line to Polyp Center */}
            <div className="w-10 h-[1.5px] bg-white/80 shadow-xs transform -rotate-12 origin-left -ml-10" />

            {/* Rounded White Capsule Pill */}
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#FA727A] animate-pulse" />
              <span className="font-semibold text-[#1E293B] tracking-tight">
                Lesion • <span className="font-mono font-bold">{length_mm.toFixed(1)} × {width_mm.toFixed(1)} mm</span>
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
