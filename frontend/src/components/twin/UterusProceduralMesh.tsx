import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface UterusProceduralMeshProps {
  crossSection: boolean;
  theme: 'light' | 'dark';
  showScanPlane?: boolean;
}

export const UterusProceduralMesh: React.FC<UterusProceduralMeshProps> = ({
  crossSection,
  theme,
  showScanPlane = true,
}) => {
  const scanPlaneRef = useRef<THREE.Mesh>(null);

  // Clipping plane for Cross-Section View (cuts coronal plane Z=0 to reveal interior cavity)
  const clippingPlanes = useMemo(() => {
    if (!crossSection) return [];
    return [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.04)];
  }, [crossSection]);

  // Refined Anatomical Lathe profile for uterine corpus, fundus, isthmus, and cervix
  // Proportions match typical nulliparous/multiparous human uterus (~7.5cm length x 5cm width)
  const lathePoints = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    // 1. External os of cervix (inferior opening)
    pts.push(new THREE.Vector2(0.22, -1.9));
    pts.push(new THREE.Vector2(0.32, -1.65));
    // 2. Cervical canal & supravaginal cervix
    pts.push(new THREE.Vector2(0.38, -1.25));
    pts.push(new THREE.Vector2(0.42, -0.85)); // Isthmus
    // 3. Corpus (body of uterus expanding laterally and anterior-posteriorly)
    pts.push(new THREE.Vector2(0.65, -0.4));
    pts.push(new THREE.Vector2(0.95, 0.25));
    pts.push(new THREE.Vector2(1.22, 0.85)); // Cornual level (widest)
    // 4. Fundus (smooth rounded anatomical dome)
    pts.push(new THREE.Vector2(1.15, 1.15));
    pts.push(new THREE.Vector2(0.85, 1.35));
    pts.push(new THREE.Vector2(0.42, 1.45));
    pts.push(new THREE.Vector2(0.0, 1.48)); // Superior apex
    return pts;
  }, []);

  // Anatomical Fallopian Tube Curves (arching gracefully from cornua)
  const leftTubeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.18, 0.9, 0),
      new THREE.Vector3(-1.55, 1.15, 0.08),
      new THREE.Vector3(-2.15, 1.05, -0.12),
      new THREE.Vector3(-2.45, 0.65, -0.22), // Ampulla & Infundibulum
      new THREE.Vector3(-2.55, 0.35, -0.28), // Fimbriae over ovary
    ]);
  }, []);

  const rightTubeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.18, 0.9, 0),
      new THREE.Vector3(1.55, 1.15, 0.08),
      new THREE.Vector3(2.15, 1.05, -0.12),
      new THREE.Vector3(2.45, 0.65, -0.22),
      new THREE.Vector3(2.55, 0.35, -0.28),
    ]);
  }, []);

  // Ovarian Ligament curves connecting ovary to uterine cornua
  const leftLigament = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, 0.75, -0.05),
      new THREE.Vector3(-1.8, 0.45, -0.2),
      new THREE.Vector3(-2.4, 0.25, -0.28),
    ]);
  }, []);

  const rightLigament = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.1, 0.75, -0.05),
      new THREE.Vector3(1.8, 0.45, -0.2),
      new THREE.Vector3(2.4, 0.25, -0.28),
    ]);
  }, []);

  // Inverted Triangular Endometrial Cavity Geometry (anatomical lumen)
  const cavityGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Top fundal width between tubal ostia: x: -0.65 to +0.65 at y: 0.95
    shape.moveTo(-0.65, 0.95);
    shape.quadraticCurveTo(0, 1.05, 0.65, 0.95);
    // Taper down to internal os of cervix at y: -0.85
    shape.quadraticCurveTo(0.25, 0.0, 0.12, -0.85);
    shape.lineTo(-0.12, -0.85);
    shape.quadraticCurveTo(-0.25, 0.0, -0.65, 0.95);

    const extrudeSettings = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  // Gentle animation for scanning plane
  useFrame(({ clock }) => {
    if (scanPlaneRef.current && showScanPlane) {
      const t = clock.getElapsedTime();
      // Smooth sinusoidal scan sweep along the longitudinal body
      scanPlaneRef.current.position.y = -0.3 + Math.sin(t * 1.2) * 0.9;
    }
  });

  // BioTrack Sophisticated Anatomical Color Palette
  // Myometrium: Soft ivory-blush in light mode, muted warm plum in dark mode
  const myometriumColor = theme === 'dark' ? '#4A3B43' : '#E8D7D8';
  // Endometrial Cavity Lining: Velvet blush in light mode, warm dusty rose in dark mode
  const cavityColor = theme === 'dark' ? '#6B4D57' : '#D9AAB0';
  // Fallopian tubes & ligaments
  const tubeColor = theme === 'dark' ? '#523E47' : '#DEC6C8';
  // Ovaries: Soft warm ivory/pearl
  const ovaryColor = theme === 'dark' ? '#8C6F77' : '#EFE2E3';

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Uterine Myometrium Outer Shell */}
      <mesh receiveShadow castShadow>
        <latheGeometry args={[lathePoints, 64]} />
        <meshPhysicalMaterial
          color={myometriumColor}
          roughness={0.42}
          metalness={0.04}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
          clippingPlanes={clippingPlanes}
          clipShadows={true}
          transparent={true}
          opacity={crossSection ? 0.72 : 0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Endometrial Cavity Inner Lining (Velvety internal mucosal lumen) */}
      <mesh geometry={cavityGeometry} position={[0, 0.15, 0]} receiveShadow>
        <meshStandardMaterial
          color={cavityColor}
          roughness={0.38}
          metalness={0.08}
          clippingPlanes={clippingPlanes}
          transparent={true}
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Left Fallopian Tube */}
      <mesh receiveShadow castShadow>
        <tubeGeometry args={[leftTubeCurve, 48, 0.075, 16, false]} />
        <meshStandardMaterial
          color={tubeColor}
          roughness={0.48}
          metalness={0.05}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* 4. Right Fallopian Tube */}
      <mesh receiveShadow castShadow>
        <tubeGeometry args={[rightTubeCurve, 48, 0.075, 16, false]} />
        <meshStandardMaterial
          color={tubeColor}
          roughness={0.48}
          metalness={0.05}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* 5. Left Ovarian Ligament */}
      <mesh>
        <tubeGeometry args={[leftLigament, 24, 0.035, 10, false]} />
        <meshStandardMaterial
          color={tubeColor}
          roughness={0.6}
          clippingPlanes={clippingPlanes}
          transparent={true}
          opacity={0.7}
        />
      </mesh>

      {/* 6. Right Ovarian Ligament */}
      <mesh>
        <tubeGeometry args={[rightLigament, 24, 0.035, 10, false]} />
        <meshStandardMaterial
          color={tubeColor}
          roughness={0.6}
          clippingPlanes={clippingPlanes}
          transparent={true}
          opacity={0.7}
        />
      </mesh>

      {/* 7. Left Ovary (Almond-shaped anatomical ellipsoid) */}
      <mesh position={[-2.45, 0.32, -0.28]} scale={[0.32, 0.44, 0.24]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={ovaryColor}
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.3}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* 8. Right Ovary (Almond-shaped anatomical ellipsoid) */}
      <mesh position={[2.45, 0.32, -0.28]} scale={[0.32, 0.44, 0.24]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={ovaryColor}
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.3}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* 9. Ultrasound Acoustic Scan Beam Plane (BioTrack Clinical Blue) */}
      {showScanPlane && (
        <mesh
          ref={scanPlaneRef}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[3.2, 1.8]} />
          <meshBasicMaterial
            color="#8FDBF6"
            transparent={true}
            opacity={0.16}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
