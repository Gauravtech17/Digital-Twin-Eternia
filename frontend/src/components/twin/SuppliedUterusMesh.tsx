import React, { useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SuppliedUterusMeshProps {
  crossSection?: boolean;
  showAnatomy?: boolean;
  onHoverStructure?: (name: string | null) => void;
  selectedStructure?: string | null;
  opacity?: number;
}

// Spatial anatomical region determination based on model-relative geometry
export function getAnatomicalRegion(localY: number, localX: number): string {
  if (Math.abs(localX) > 0.45) return 'Fallopian Tube & Tubal Ostium';
  if (localY > 0.25) return 'Uterine Fundus';
  if (localY < -0.25) return 'Cervix Uteri & Cervical Canal';
  return 'Uterine Corpus (Endometrial Cavity)';
}

export const SuppliedUterusMesh: React.FC<SuppliedUterusMeshProps> = ({
  crossSection = true,
  showAnatomy = true,
  onHoverStructure,
  selectedStructure = null,
  opacity = 1.0,
}) => {
  // Load authoritative anatomical asset uterus.glb
  const gltf = useGLTF('/models/uterus.glb');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Coronal clipping plane for cutaway inspection (reveals internal endometrial cavity)
  const clippingPlanes = useMemo(() => {
    if (!crossSection) return [];
    // Plane facing +Z: clips points where z > 0.04 (slices anterior wall)
    return [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.04)];
  }, [crossSection]);

  // Deep clone scene and compute normalized bounding box
  const { clonedScene, centerOffset, scaleFactor } = useMemo(() => {
    const clone = gltf.scene.clone(true);

    // Compute bounding box in local/world units
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Max dimension in uterus.glb is ~1.0 unit. Normalize so max dimension is ~2.3 units
    const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
    const targetScale = 2.3 / maxDim;

    return {
      clonedScene: clone,
      centerOffset: center,
      scaleFactor: targetScale,
    };
  }, [gltf.scene]);

  // Setup medical materials respecting the original texture while supporting cross-section clipping
  useMemo(() => {
    if (!clonedScene) return;

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // If mesh has original materials, configure for double-sided clipping & medical finish
        const originalMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const texture = (originalMat as any)?.map || null;

        const mat = new THREE.MeshPhysicalMaterial({
          map: texture,
          color: texture ? new THREE.Color('#FFFFFF') : new THREE.Color('#F2E8E7'),
          roughness: 0.38,
          metalness: 0.04,
          clearcoat: 0.3,
          clearcoatRoughness: 0.2,
          side: THREE.DoubleSide,
          clippingPlanes: clippingPlanes,
          clipShadows: true,
          transparent: opacity < 1.0,
          opacity: opacity,
        });

        mesh.material = mat;
        mesh.visible = showAnatomy;
      }
    });
  }, [clonedScene, clippingPlanes, showAnatomy, opacity]);

  if (!showAnatomy) return null;

  return (
    <group
      scale={[scaleFactor, scaleFactor, scaleFactor]}
      position={[
        -centerOffset.x * scaleFactor,
        -centerOffset.y * scaleFactor,
        -centerOffset.z * scaleFactor,
      ]}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.point && onHoverStructure) {
          const region = getAnatomicalRegion(e.point.y, e.point.x);
          setHoveredRegion(region);
          onHoverStructure(region);
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHoveredRegion(null);
        if (onHoverStructure) {
          onHoverStructure(null);
        }
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

// Preload authoritative model
useGLTF.preload('/models/uterus.glb');
