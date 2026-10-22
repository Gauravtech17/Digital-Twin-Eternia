import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ScanStep, SyntheticTargetConfig, DEFAULT_SYNTHETIC_TARGET } from './ScanPathGenerator';

export interface GridScanControllerProps {
  scanSteps: ScanStep[];
  activeStepIndex: number;
  completedStepIndices: number[];
  targetConfig?: SyntheticTargetConfig;
  isScanning: boolean;
  isPaused?: boolean;
  candidateFound: boolean;
  windowSize?: number;
  showProjectionBeam?: boolean;
  showTargetGeometry?: boolean;
  targetLengthMm?: number;
  targetWidthMm?: number;
  targetDepthMm?: number;
  onStepDwell?: (step: ScanStep) => void;
}

export const GridScanController: React.FC<GridScanControllerProps> = ({
  scanSteps,
  activeStepIndex,
  completedStepIndices,
  targetConfig = DEFAULT_SYNTHETIC_TARGET,
  isScanning,
  isPaused = false,
  candidateFound,
  windowSize = 0.20,
  showProjectionBeam = true,
  showTargetGeometry = true,
  targetLengthMm = 10.8,
  targetWidthMm = 7.4,
  targetDepthMm = 6.8,
}) => {
  const windowGroupRef = useRef<THREE.Group>(null);
  const activeCellRef = useRef<THREE.Mesh>(null);
  const targetGlowRef = useRef<THREE.Mesh>(null);

  const activeStep = activeStepIndex >= 0 && activeStepIndex < scanSteps.length
    ? scanSteps[activeStepIndex]
    : null;

  // Colors matching the POLYPULSE mint and teal medical design language
  const tealMuted = '#2F8F83';
  const tealBright = '#53B4A6';
  const amberTarget = '#B77B36';
  const coralLesion = '#FA727A';

  // Pre-generate grid wireframe geometry for the scanning window
  const { frameGeometry, innerGridGeometry, cornerReticlesGeometry, beamGeometry } = useMemo(() => {
    const half = windowSize / 2;
    const third = windowSize / 3;

    // Outer square frame
    const framePoints = [
      new THREE.Vector3(-half, -half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, -half, 0),
    ];
    const frameGeo = new THREE.BufferGeometry().setFromPoints(framePoints);

    // 3x3 inner grid lines
    const gridPoints: THREE.Vector3[] = [];
    // 2 Vertical inner lines
    gridPoints.push(new THREE.Vector3(-half + third, -half, 0));
    gridPoints.push(new THREE.Vector3(-half + third, half, 0));
    gridPoints.push(new THREE.Vector3(-half + 2 * third, -half, 0));
    gridPoints.push(new THREE.Vector3(-half + 2 * third, half, 0));
    // 2 Horizontal inner lines
    gridPoints.push(new THREE.Vector3(-half, -half + third, 0));
    gridPoints.push(new THREE.Vector3(half, -half + third, 0));
    gridPoints.push(new THREE.Vector3(-half, -half + 2 * third, 0));
    gridPoints.push(new THREE.Vector3(half, -half + 2 * third, 0));
    const innerGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);

    // Corner reticles (small L brackets)
    const reticleLen = windowSize * 0.22;
    const reticlePoints: THREE.Vector3[] = [];
    // Top-Left
    reticlePoints.push(new THREE.Vector3(-half, half - reticleLen, 0.001));
    reticlePoints.push(new THREE.Vector3(-half, half, 0.001));
    reticlePoints.push(new THREE.Vector3(-half, half, 0.001));
    reticlePoints.push(new THREE.Vector3(-half + reticleLen, half, 0.001));
    // Top-Right
    reticlePoints.push(new THREE.Vector3(half - reticleLen, half, 0.001));
    reticlePoints.push(new THREE.Vector3(half, half, 0.001));
    reticlePoints.push(new THREE.Vector3(half, half, 0.001));
    reticlePoints.push(new THREE.Vector3(half, half - reticleLen, 0.001));
    // Bottom-Right
    reticlePoints.push(new THREE.Vector3(half, -half + reticleLen, 0.001));
    reticlePoints.push(new THREE.Vector3(half, -half, 0.001));
    reticlePoints.push(new THREE.Vector3(half, -half, 0.001));
    reticlePoints.push(new THREE.Vector3(half - reticleLen, -half, 0.001));
    // Bottom-Left
    reticlePoints.push(new THREE.Vector3(-half + reticleLen, -half, 0.001));
    reticlePoints.push(new THREE.Vector3(-half, -half, 0.001));
    reticlePoints.push(new THREE.Vector3(-half, -half, 0.001));
    reticlePoints.push(new THREE.Vector3(-half, -half + reticleLen, 0.001));
    const reticleGeo = new THREE.BufferGeometry().setFromPoints(reticlePoints);

    // Acoustic projection beam (4 corner lines projecting inward in -Z)
    const beamDepth = 0.12;
    const beamTaper = 0.65; // Slightly converge towards coronal plane
    const beamPoints: THREE.Vector3[] = [];
    beamPoints.push(new THREE.Vector3(-half, -half, 0));
    beamPoints.push(new THREE.Vector3(-half * beamTaper, -half * beamTaper, -beamDepth));

    beamPoints.push(new THREE.Vector3(half, -half, 0));
    beamPoints.push(new THREE.Vector3(half * beamTaper, -half * beamTaper, -beamDepth));

    beamPoints.push(new THREE.Vector3(half, half, 0));
    beamPoints.push(new THREE.Vector3(half * beamTaper, half * beamTaper, -beamDepth));

    beamPoints.push(new THREE.Vector3(-half, half, 0));
    beamPoints.push(new THREE.Vector3(-half * beamTaper, half * beamTaper, -beamDepth));
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);

    return {
      frameGeometry: frameGeo,
      innerGridGeometry: innerGeo,
      cornerReticlesGeometry: reticleGeo,
      beamGeometry: beamGeo,
    };
  }, [windowSize]);

  // Smooth interpolation of scanning window position
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (windowGroupRef.current && activeStep) {
      // Lerp position towards active step
      windowGroupRef.current.position.lerp(activeStep.position, 0.22);
      windowGroupRef.current.visible = true;
    } else if (windowGroupRef.current && activeStepIndex < 0) {
      windowGroupRef.current.visible = false;
    }

    // Active center cell pulse
    if (activeCellRef.current) {
      const pulse = 1.0 + Math.sin(t * 8.0) * 0.15;
      activeCellRef.current.scale.set(pulse, pulse, 1.0);
    }

    // Candidate lesion pulse
    if (targetGlowRef.current) {
      const gSpeed = candidateFound ? 4.5 : 2.0;
      const gPulse = 1.0 + Math.sin(t * gSpeed) * (candidateFound ? 0.25 : 0.08);
      targetGlowRef.current.scale.set(gPulse, gPulse, gPulse);
    }
  });

  // Calculate synthetic lesion dimensions
  const sx = Math.max(0.08, (targetLengthMm / 10.0) * 0.25);
  const sy = Math.max(0.08, (targetWidthMm / 10.0) * 0.22);
  const sz = Math.max(0.08, (targetDepthMm / 10.0) * 0.20);

  const isCurrentStepTarget = activeStep?.isTargetIntersection || false;

  return (
    <group name="SpatialGridScanSimulation">
      {/* 1. Accumulated Scan Coverage Layer (Translucent Footprint Tiles) */}
      <group name="ScanCoverageLayer">
        {completedStepIndices.map((idx) => {
          const step = scanSteps[idx];
          if (!step) return null;
          const isTargetStep = step.isTargetIntersection;

          return (
            <mesh
              key={`coverage-step-${idx}`}
              position={[step.position.x, step.position.y, step.position.z - 0.002]}
            >
              <planeGeometry args={[windowSize * 0.92, windowSize * 0.92]} />
              <meshBasicMaterial
                color={isTargetStep ? amberTarget : tealMuted}
                transparent={true}
                opacity={isTargetStep ? 0.28 : 0.14}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>

      {/* 2. Active 3D Scanning Window */}
      <group
        ref={windowGroupRef}
        visible={activeStepIndex >= 0}
        position={activeStep ? [activeStep.position.x, activeStep.position.y, activeStep.position.z] : [0, 0, 0]}
      >
        {/* Outer Frame Line Loop */}
        <lineLoop geometry={frameGeometry}>
          <lineBasicMaterial
            color={isCurrentStepTarget ? amberTarget : tealMuted}
            linewidth={1.5}
            transparent={true}
            opacity={0.85}
          />
        </lineLoop>

        {/* 3x3 Inner Grid Lines */}
        <lineSegments geometry={innerGridGeometry}>
          <lineBasicMaterial
            color={isCurrentStepTarget ? amberTarget : tealMuted}
            linewidth={1}
            transparent={true}
            opacity={0.55}
          />
        </lineSegments>

        {/* Corner Reticle Brackets (Bright accents) */}
        <lineSegments geometry={cornerReticlesGeometry}>
          <lineBasicMaterial
            color={isCurrentStepTarget ? '#FFFFFF' : tealBright}
            linewidth={2}
            transparent={true}
            opacity={0.95}
          />
        </lineSegments>

        {/* Active Scanning Center Cell */}
        <mesh ref={activeCellRef} position={[0, 0, 0.001]}>
          <planeGeometry args={[windowSize / 3.2, windowSize / 3.2]} />
          <meshBasicMaterial
            color={isCurrentStepTarget ? amberTarget : tealBright}
            transparent={true}
            opacity={isCurrentStepTarget ? 0.65 : 0.40}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Acoustic Projection Transducer Beam (Volumetric Depth Cue) */}
        {showProjectionBeam && (
          <lineSegments geometry={beamGeometry}>
            <lineBasicMaterial
              color={isCurrentStepTarget ? amberTarget : tealMuted}
              linewidth={1}
              transparent={true}
              opacity={0.35}
            />
          </lineSegments>
        )}

        {/* Subtle Spatial Scan Window Label Pill */}
        {isScanning && activeStep && (
          <Html position={[0, windowSize * 0.7, 0]} center distanceFactor={4.2}>
            <div className="pointer-events-none select-none px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs border border-[#DDE7E5] shadow-xs flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrentStepTarget ? 'bg-[#B77B36] animate-ping' : 'bg-[#2F8F83] animate-pulse'
                }`}
              />
              <span className="font-mono text-[9px] font-bold text-[#20332F] tabular-nums">
                {isCurrentStepTarget ? 'TARGET INTERSECT' : `R${activeStep.row + 1}:C${activeStep.col + 1}`}
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* 3. Illustrative Polyp Target (Shared Synthetic Entity) */}
      {showTargetGeometry && (
        <group position={[targetConfig.position.x, targetConfig.position.y, targetConfig.position.z]}>
          {/* Always Rendered Illustrative Lesion Geometry */}
          <mesh scale={[sx, sy, sz]} castShadow receiveShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <meshPhysicalMaterial
              color={coralLesion}
              emissive={candidateFound ? '#D64552' : '#8A2B35'}
              emissiveIntensity={candidateFound ? 0.6 : 0.25}
              roughness={0.32}
              metalness={0.06}
              clearcoat={0.7}
              clearcoatRoughness={0.25}
            />
          </mesh>

          {/* Soft Breathing Halo */}
          <mesh ref={targetGlowRef} scale={[sx * 1.3, sy * 1.3, sz * 1.3]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial
              color={candidateFound ? '#FF9EAA' : '#FA727A'}
              transparent={true}
              opacity={candidateFound ? 0.45 : 0.18}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Target Reticle Ring when Candidate is Encountered */}
          {(candidateFound || isCurrentStepTarget) && (
            <mesh position={[0, 0, sz * 1.08]}>
              <ringGeometry args={[sx * 0.85, sx * 0.95, 32]} />
              <meshBasicMaterial
                color={amberTarget}
                transparent={true}
                opacity={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Floating Spatial Annotation when Candidate Identified */}
          {candidateFound && (
            <Html position={[sx * 1.2, sy * 0.8, sz]} distanceFactor={3.8}>
              <div className="pointer-events-none select-none pl-2 border-l-2 border-[#B77B36] bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-r-xl shadow-md space-y-0.5 text-left min-w-[140px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B77B36] animate-pulse" />
                  <span className="text-[9px] font-bold tracking-wider uppercase text-[#B77B36]">
                    Candidate Region
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-[#20332F] tabular-nums">
                  {targetLengthMm.toFixed(1)} × {targetWidthMm.toFixed(1)} mm
                </div>
                <div className="text-[8px] font-mono text-[#71817D] uppercase">
                  SYNTHETIC DEMO TARGET
                </div>
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
};
