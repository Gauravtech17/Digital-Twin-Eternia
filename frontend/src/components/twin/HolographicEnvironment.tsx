import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HolographicEnvironmentProps {
  showParticles?: boolean;
}

export const HolographicEnvironment: React.FC<HolographicEnvironmentProps> = ({
  showParticles = true,
}) => {
  const particlesRef = useRef<THREE.Points>(null);

  // Subtle ambient floating dust particles in light cyan
  const [particlePositions] = useMemo(() => {
    const count = 75;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.5 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
    }
    return [positions];
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (particlesRef.current) {
      const geom = particlesRef.current.geometry;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          const y = posAttr.getY(i);
          const newY = y + Math.sin(t * 0.5 + i) * 0.0015;
          posAttr.setY(i, newY > 3.0 ? -2.0 : newY);
        }
        posAttr.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* 1. Studio Lighting System (Soft Warm Key + Vibrant Cyan Rim) */}
      <ambientLight intensity={1.2} color="#F0F8FF" />

      {/* Main key directional light for anatomical depth */}
      <directionalLight position={[4, 7, 5]} intensity={1.6} color="#FFFFFF" />

      {/* Cyan Rim Lighting (producing glowing cyan edge silhouettes) */}
      <directionalLight position={[-5, 4, -4]} intensity={2.4} color="#5CE1E6" />
      <directionalLight position={[5, -1, -3]} intensity={1.5} color="#70D6FF" />

      {/* Soft front-fill for cavity interior */}
      <directionalLight position={[-2, 1, 4]} intensity={0.9} color="#E0F2FE" />

      {/* Localized point light illuminating cavity lumen */}
      <pointLight position={[0, 0.4, 1.8]} intensity={1.3} color="#FFFFFF" distance={5} />

      {/* 2. Floating Cyan Micro-Particles */}
      {showParticles && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.032}
            color="#48CAE4"
            transparent={true}
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};
