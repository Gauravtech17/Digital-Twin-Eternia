import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HolographicScanPlaneProps {
  progress?: number; // 0.0 (fundus apex) to 1.0 (cervix base)
  isScanning?: boolean;
  reducedMotion?: boolean;
  color?: string;
  glowColor?: string;
}

export const HolographicScanPlane: React.FC<HolographicScanPlaneProps> = ({
  progress = 0,
  isScanning = false,
  reducedMotion = false,
  color = '#48CAE4',
  glowColor = '#70D6FF',
}) => {
  const planeRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!planeRef.current) return;

    if (isScanning) {
      // In active assessment mode: position is driven directly by progress (fundus to cervix)
      // Top fundus apex is ~ +1.4, lower cervix external os is ~ -1.7
      const targetY = 1.35 - progress * 2.9;
      planeRef.current.position.y = targetY;
    } else if (!reducedMotion) {
      // Idle gentle undulating sweep
      const t = clock.getElapsedTime();
      planeRef.current.position.y = -0.15 + Math.sin(t * 1.2) * 0.75;
    }

    // Outer acoustic pulse expansion
    if (pulseRingRef.current && !reducedMotion) {
      const t = clock.getElapsedTime();
      const s = 1.0 + (Math.sin(t * 4.0) * 0.5 + 0.5) * 0.12;
      pulseRingRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group ref={planeRef} position={[0, 0, 0]}>
      {/* 1. Luminous Transverse Holographic Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 2.6]} />
        <meshBasicMaterial
          color={color}
          transparent={true}
          opacity={isScanning ? 0.24 : 0.14}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Concentric Sweeping Border Ring */}
      <mesh
        ref={pulseRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
      >
        <ringGeometry args={[1.45, 1.52, 72]} />
        <meshBasicMaterial
          color={glowColor}
          transparent={true}
          opacity={isScanning ? 0.7 : 0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Central Acoustic Crosshair Line */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(3.8, 0.02)]} />
        <lineBasicMaterial
          color="#FFFFFF"
          transparent={true}
          opacity={isScanning ? 0.8 : 0.45}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};
