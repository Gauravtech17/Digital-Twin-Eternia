import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HolographicUterusMeshProps {
  crossSection?: boolean;
  scanPhase?: 'INITIALIZING' | 'ACTIVE_SCANNING' | 'LESION_ANALYSIS' | 'SAVING' | 'COMPLETED' | 'IDLE';
  scanProgress?: number;
}

export const HolographicUterusMesh: React.FC<HolographicUterusMeshProps> = ({
  crossSection = true,
  scanPhase = 'IDLE',
  scanProgress = 0,
}) => {
  const myometriumRef = useRef<THREE.Mesh>(null);

  // Smooth clipping plane for coronal cutaway view (cuts anterior half Z > 0 to reveal cavity)
  const clippingPlanes = useMemo(() => {
    if (!crossSection) return [];
    return [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.04)];
  }, [crossSection]);

  // 1. High-Resolution Lathe Profile for Uterine Corpus, Fundus, Isthmus, and Cervix
  // Smooth, organic curves matching the medical reference image
  const lathePoints = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    // External cervical os at inferior base
    pts.push(new THREE.Vector2(0.25, -1.85));
    pts.push(new THREE.Vector2(0.35, -1.6));
    // Cervix canal
    pts.push(new THREE.Vector2(0.38, -1.3));
    pts.push(new THREE.Vector2(0.42, -1.0));
    // Isthmus
    pts.push(new THREE.Vector2(0.48, -0.65));
    // Lower corpus
    pts.push(new THREE.Vector2(0.72, -0.2));
    // Mid corpus
    pts.push(new THREE.Vector2(1.02, 0.35));
    // Cornual level (widest lateral flare)
    pts.push(new THREE.Vector2(1.30, 0.9));
    // Broad, convex rounded fundus dome
    pts.push(new THREE.Vector2(1.22, 1.18));
    pts.push(new THREE.Vector2(0.95, 1.40));
    pts.push(new THREE.Vector2(0.52, 1.50));
    pts.push(new THREE.Vector2(0.0, 1.52)); // Superior apex
    return pts;
  }, []);

  // 2. Bilateral Fallopian Tube Curves (Graceful anatomical arches)
  const leftTubeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.25, 0.92, 0.0),
      new THREE.Vector3(-1.68, 1.28, 0.08),
      new THREE.Vector3(-2.25, 1.18, -0.1),
      new THREE.Vector3(-2.62, 0.75, -0.24),
      new THREE.Vector3(-2.72, 0.38, -0.3),
    ]);
  }, []);

  const rightTubeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.25, 0.92, 0.0),
      new THREE.Vector3(1.68, 1.28, 0.08),
      new THREE.Vector3(2.25, 1.18, -0.1),
      new THREE.Vector3(2.62, 0.75, -0.24),
      new THREE.Vector3(2.72, 0.38, -0.3),
    ]);
  }, []);

  // 3. Fimbriae Petals (Branching finger-like filaments wrapping over ovaries)
  const fimbriaeLeft = useMemo(() => {
    const fimbriae: THREE.Vector3[][] = [];
    const origin = new THREE.Vector3(-2.72, 0.38, -0.3);
    const angles = [0, 0.65, 1.3, 1.95, 2.6, 3.25, 3.9, 4.55, 5.2, 5.85];
    angles.forEach((rad) => {
      const dirX = Math.cos(rad) * 0.18;
      const dirZ = Math.sin(rad) * 0.15;
      const mid = new THREE.Vector3(origin.x + dirX * 0.6, origin.y - 0.12, origin.z + dirZ * 0.6);
      const tip = new THREE.Vector3(origin.x + dirX, origin.y - 0.24, origin.z + dirZ);
      fimbriae.push([origin, mid, tip]);
    });
    return fimbriae;
  }, []);

  const fimbriaeRight = useMemo(() => {
    const fimbriae: THREE.Vector3[][] = [];
    const origin = new THREE.Vector3(2.72, 0.38, -0.3);
    const angles = [0, 0.65, 1.3, 1.95, 2.6, 3.25, 3.9, 4.55, 5.2, 5.85];
    angles.forEach((rad) => {
      const dirX = Math.cos(rad) * 0.18;
      const dirZ = Math.sin(rad) * 0.15;
      const mid = new THREE.Vector3(origin.x + dirX * 0.6, origin.y - 0.12, origin.z + dirZ * 0.6);
      const tip = new THREE.Vector3(origin.x + dirX, origin.y - 0.24, origin.z + dirZ);
      fimbriae.push([origin, mid, tip]);
    });
    return fimbriae;
  }, []);

  // 4. Bilateral Ovarian Ligaments
  const leftLigament = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.18, 0.80, -0.05),
      new THREE.Vector3(-1.88, 0.48, -0.2),
      new THREE.Vector3(-2.45, 0.24, -0.28),
    ]);
  }, []);

  const rightLigament = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.18, 0.80, -0.05),
      new THREE.Vector3(1.88, 0.48, -0.2),
      new THREE.Vector3(2.45, 0.24, -0.28),
    ]);
  }, []);

  // 5. Smooth Inverted Triangular Endometrial Cavity (Soft velvety mucosal lining)
  const cavityGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Intercornual fundal ceiling
    shape.moveTo(-0.68, 0.98);
    shape.quadraticCurveTo(0, 1.10, 0.68, 0.98);
    // Lateral uterine cavity wall tapering down to internal cervical os
    shape.quadraticCurveTo(0.28, 0.08, 0.14, -0.85);
    shape.lineTo(-0.14, -0.85);
    shape.quadraticCurveTo(-0.28, 0.08, -0.68, 0.98);

    const extrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 4,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  // Smooth, pearlescent breathing pulse during assessment
  useFrame(({ clock }) => {
    if (!myometriumRef.current) return;
    if (scanPhase === 'ACTIVE_SCANNING') {
      const t = clock.getElapsedTime();
      const pulse = 0.9 + Math.sin(t * 3.5) * 0.08;
      (myometriumRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = pulse * 0.35;
    }
  });

  // Color Tokens matching Reference Target (media_1792286910641_c5b35a88.jpg)
  const myometriumPink = '#F5B5BC';
  const myometriumShadow = '#C56D77';
  const cavityMucosaPink = '#DC6B78';
  const tubePink = '#F7BDC3';
  const ovaryIvoryPink = '#F7D4D8';

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Translucent Pearlescent Myometrium Body (High-resolution smooth mesh, NO WIREFRAME) */}
      <mesh ref={myometriumRef} receiveShadow castShadow>
        <latheGeometry args={[lathePoints, 96]} />
        <meshPhysicalMaterial
          color={myometriumPink}
          emissive={myometriumShadow}
          emissiveIntensity={0.22}
          roughness={0.24}
          metalness={0.06}
          clearcoat={0.92}
          clearcoatRoughness={0.14}
          transmission={0.34}
          transparent={true}
          opacity={crossSection ? 0.90 : 0.96}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
          clipShadows={true}
        />
      </mesh>

      {/* 2. Endometrial Cavity Mucosal Lining (Velvety striated internal pink lumen) */}
      {crossSection && (
        <mesh geometry={cavityGeometry} position={[0, 0.16, -0.06]} receiveShadow>
          <meshPhysicalMaterial
            color={cavityMucosaPink}
            emissive="#8A2834"
            emissiveIntensity={scanPhase === 'LESION_ANALYSIS' ? 0.45 : 0.28}
            roughness={0.30}
            metalness={0.08}
            clearcoat={0.75}
            clearcoatRoughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Left Fallopian Tube & Fimbriae (Smooth, NO WIREFRAME) */}
      <group>
        <mesh receiveShadow castShadow>
          <tubeGeometry args={[leftTubeCurve, 72, 0.088, 24, false]} />
          <meshPhysicalMaterial
            color={tubePink}
            emissive={myometriumShadow}
            emissiveIntensity={0.2}
            roughness={0.25}
            metalness={0.05}
            clearcoat={0.9}
            clearcoatRoughness={0.16}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
        {/* Fimbriae Petals */}
        {fimbriaeLeft.map((pts, fIdx) => (
          <mesh key={`fimbria-l-${fIdx}`}>
            <tubeGeometry
              args={[
                new THREE.CatmullRomCurve3(pts),
                16,
                0.024,
                10,
                false,
              ]}
            />
            <meshStandardMaterial
              color={tubePink}
              roughness={0.3}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>

      {/* 4. Right Fallopian Tube & Fimbriae (Smooth, NO WIREFRAME) */}
      <group>
        <mesh receiveShadow castShadow>
          <tubeGeometry args={[rightTubeCurve, 72, 0.088, 24, false]} />
          <meshPhysicalMaterial
            color={tubePink}
            emissive={myometriumShadow}
            emissiveIntensity={0.2}
            roughness={0.25}
            metalness={0.05}
            clearcoat={0.9}
            clearcoatRoughness={0.16}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
        {/* Fimbriae Petals */}
        {fimbriaeRight.map((pts, fIdx) => (
          <mesh key={`fimbria-r-${fIdx}`}>
            <tubeGeometry
              args={[
                new THREE.CatmullRomCurve3(pts),
                16,
                0.024,
                10,
                false,
              ]}
            />
            <meshStandardMaterial
              color={tubePink}
              roughness={0.3}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>

      {/* 5. Bilateral Ovarian Ligaments */}
      <mesh>
        <tubeGeometry args={[leftLigament, 32, 0.038, 12, false]} />
        <meshStandardMaterial
          color={tubePink}
          roughness={0.4}
          clippingPlanes={clippingPlanes}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[rightLigament, 32, 0.038, 12, false]} />
        <meshStandardMaterial
          color={tubePink}
          roughness={0.4}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* 6. Bilateral Almond-Shaped Ovaries with Pearlescent Surface (Smooth, NO WIREFRAME) */}
      <group position={[-2.48, 0.32, -0.28]}>
        <mesh scale={[0.35, 0.48, 0.28]} castShadow receiveShadow>
          <sphereGeometry args={[1, 36, 36]} />
          <meshPhysicalMaterial
            color={ovaryIvoryPink}
            emissive={myometriumShadow}
            emissiveIntensity={0.18}
            roughness={0.32}
            metalness={0.08}
            clearcoat={0.7}
            clearcoatRoughness={0.2}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      </group>

      <group position={[2.48, 0.32, -0.28]}>
        <mesh scale={[0.35, 0.48, 0.28]} castShadow receiveShadow>
          <sphereGeometry args={[1, 36, 36]} />
          <meshPhysicalMaterial
            color={ovaryIvoryPink}
            emissive={myometriumShadow}
            emissiveIntensity={0.18}
            roughness={0.32}
            metalness={0.08}
            clearcoat={0.7}
            clearcoatRoughness={0.2}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      </group>
    </group>
  );
};
