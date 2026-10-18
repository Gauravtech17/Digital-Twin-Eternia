import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { HolographicEnvironment } from './HolographicEnvironment';
import { HolographicUterusMesh } from './HolographicUterusMesh';
import { HolographicLesion } from './HolographicLesion';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';

export type HolographicViewMode = 'cutaway' | '3d';
export type HolographicScanPhase =
  | 'INITIALIZING'
  | 'ACTIVE_SCANNING'
  | 'LESION_ANALYSIS'
  | 'SAVING'
  | 'COMPLETED'
  | 'IDLE';

interface HolographicViewportProps {
  lesionLengthMm?: number;
  lesionWidthMm?: number;
  lesionDepthMm?: number | null;
  placementX?: number;
  placementY?: number;
  placementZ?: number;
  showAnnotation?: boolean;
  showScanPlane?: boolean;
  isScanning?: boolean;
  scanPhase?: HolographicScanPhase;
  scanProgress?: number; // 0.0 to 1.0
  autoRotate?: boolean;
  showPedestal?: boolean;
  showParticles?: boolean;
  reducedMotion?: boolean;
  className?: string;
  showHudControls?: boolean;
  initialViewMode?: HolographicViewMode;
}

export const HolographicViewport: React.FC<HolographicViewportProps> = ({
  lesionLengthMm = 10.8,
  lesionWidthMm = 7.4,
  lesionDepthMm = 6.8,
  placementX = 0.18,
  placementY = 0.38,
  placementZ = -0.02,
  showAnnotation = true,
  showScanPlane = false,
  isScanning = false,
  scanPhase = 'IDLE',
  scanProgress = 0,
  autoRotate = false,
  showPedestal = false,
  showParticles = true,
  reducedMotion = false,
  className = 'w-full h-full min-h-[460px]',
  showHudControls = true,
  initialViewMode = 'cutaway',
}) => {
  // Mode: 'cutaway' (reveals inner cavity & polyp, reference default) | '3d' (full outer organ)
  const [viewMode, setViewMode] = useState<HolographicViewMode>(initialViewMode);
  const controlsRef = useRef<any>(null);

  // Zoom In / Out Handlers for Left Vertical Pill
  const handleZoom = (delta: number) => {
    if (!controlsRef.current) return;
    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, delta);
    controlsRef.current.update();
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.28, 4.35);
    controlsRef.current.target.set(0, 0.04, 0);
    controlsRef.current.update();
  };

  const isCutaway = viewMode === 'cutaway';
  const isPolypHighlighted = scanPhase === 'LESION_ANALYSIS' || scanPhase === 'SAVING' || scanPhase === 'COMPLETED';

  return (
    <div className={`relative overflow-hidden rounded-3xl select-none ${className} bg-[#F4F9FD]`}>
      {/* 1. Real 3D WebGL Canvas */}
      <Canvas
        shadows
        gl={{
          localClippingEnabled: true,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{
          background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F0F6FC 55%, #E3EDF8 100%)',
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.28, 4.35]} fov={44} />
        <OrbitControls
          ref={controlsRef}
          enableDamping={true}
          dampingFactor={0.06}
          minDistance={2.2}
          maxDistance={8.0}
          autoRotate={autoRotate && !isScanning && !reducedMotion}
          autoRotateSpeed={0.5}
        />

        {/* Ambient Studio Lighting & Subtle Floating Dust */}
        <HolographicEnvironment
          showParticles={showParticles && !reducedMotion}
        />

        {/* Translucent Pearlescent Uterus Model with Soft Cyan Rim Glow */}
        <HolographicUterusMesh
          crossSection={isCutaway}
          scanPhase={scanPhase}
          scanProgress={scanProgress}
        />

        {/* Endometrial Coral-Pink Polyp Lesion & Glassmorphic Measurement Callout */}
        {isCutaway && (
          <HolographicLesion
            length_mm={lesionLengthMm}
            width_mm={lesionWidthMm}
            depth_mm={lesionDepthMm}
            placement_x={placementX}
            placement_y={placementY}
            placement_z={placementZ}
            showAnnotation={showAnnotation}
            highlighted={isPolypHighlighted}
          />
        )}
      </Canvas>

      {/* 2. Top Navigation Bar Overlay (Directly matching Reference Image) */}
      {showHudControls && (
        <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
          {/* Top Left: POLYPULSE | DIGITAL TWIN Brand Header */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-xs pointer-events-auto">
            {/* Infinity Logo Icon */}
            <div className="text-[#6366F1] flex items-center justify-center">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.98l-2.83-2.83A5.333 5.333 0 0 0 5.4 6.62C2.42 6.62 0 9.04 0 12.02s2.42 5.4 5.4 5.4c1.44 0 2.8-.56 3.77-1.53L12 13.06l2.83 2.83c.97.97 2.33 1.53 3.77 1.53 2.98 0 5.4-2.42 5.4-5.4s-2.42-5.4-5.4-5.4zm-13.2 9c-1.99 0-3.6-1.61-3.6-3.6s1.61-3.6 3.6-3.6c.96 0 1.86.37 2.55 1.05L10.3 12l-2.35 2.57c-.69.68-1.59 1.05-2.55 1.05zm13.2 0c-.96 0-1.86-.37-2.55-1.05L13.7 12l2.35-2.57c.69-.68 1.59-1.05 2.55-1.05 1.99 0 3.6 1.61 3.6 3.6s-1.61 3.6-3.6 3.6z" />
              </svg>
            </div>
            <span className="font-extrabold tracking-wider text-xs text-[#0F172A]">
              POLYPULSE
            </span>
            <span className="text-gray-300 font-light">|</span>
            <span className="text-[11px] font-semibold tracking-wider text-[#64748B] uppercase font-mono">
              DIGITAL TWIN
            </span>
          </div>

          {/* Top Right: Capsule Toggle [ 3D | Cutaway ] (Reference Target) */}
          <div className="flex items-center p-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-sm pointer-events-auto">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[#EBF5FF] text-[#0284C7] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cutaway')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cutaway'
                  ? 'bg-[#DDF0FF] text-[#0369A1] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cutaway
            </button>
          </div>
        </div>
      )}

      {/* 3. Left Floating Vertical Tool Pill (Directly matching Reference Image) */}
      {showHudControls && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.06)] z-10 pointer-events-auto">
          {/* Rotate / Orbit mode icon */}
          <button
            type="button"
            onClick={() => handleZoom(0)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Rotate & Orbit Viewport (Click and drag)"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={() => handleZoom(0.4)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={() => handleZoom(-0.4)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Right Margin Technical Ticks (Subtle measurement axis) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col justify-between h-48 pointer-events-none opacity-40">
        {[...Array(9)].map((_, i) => (
          <div key={`tick-${i}`} className="flex items-center gap-1">
            <span className="w-2.5 h-[1px] bg-[#64748B]" />
            <span className="text-[8px] font-mono text-[#64748B]">{8 - i}cm</span>
          </div>
        ))}
      </div>
    </div>
  );
};
