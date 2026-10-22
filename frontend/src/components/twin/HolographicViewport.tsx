import React, { useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { HolographicEnvironment } from './HolographicEnvironment';
import { SuppliedUterusMesh } from './SuppliedUterusMesh';
import { HolographicLesion } from './HolographicLesion';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Box,
  Activity,
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
  placementX = 0.12,
  placementY = 0.22,
  placementZ = 0.00,
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
  const [showAnatomy, setShowAnatomy] = useState<boolean>(true);
  const [showLesion, setShowLesion] = useState<boolean>(true);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);

  // Zoom In / Out Handlers
  const handleZoom = (delta: number) => {
    if (!controlsRef.current) return;
    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, delta);
    controlsRef.current.update();
  };

  // Reset Camera View to Default Coronal Framing
  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.18, 4.0);
    controlsRef.current.target.set(0, 0.05, 0);
    controlsRef.current.update();
  };

  // Fit Model to View
  const handleFitToView = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.15, 3.4);
    controlsRef.current.target.set(0, 0.05, 0);
    controlsRef.current.update();
  };

  // Set Camera View Orientation
  const handleSetViewAngle = (angle: 'coronal' | 'anterior' | 'sagittal' | 'superior') => {
    if (!controlsRef.current) return;
    if (angle === 'coronal' || angle === 'anterior') {
      controlsRef.current.object.position.set(0, 0.18, 4.0);
      controlsRef.current.target.set(0, 0.05, 0);
    } else if (angle === 'sagittal') {
      controlsRef.current.object.position.set(4.0, 0.15, 0);
      controlsRef.current.target.set(0, 0.05, 0);
    } else if (angle === 'superior') {
      controlsRef.current.object.position.set(0, 4.0, 0.01);
      controlsRef.current.target.set(0, 0.05, 0);
    }
    controlsRef.current.update();
  };

  const isCutaway = viewMode === 'cutaway';
  const isPolypHighlighted =
    scanPhase === 'LESION_ANALYSIS' || scanPhase === 'SAVING' || scanPhase === 'COMPLETED';

  return (
    <div className={`relative overflow-hidden rounded-3xl select-none ${className} bg-[#F8FAFC]`}>
      {/* 1. Real 3D WebGL Canvas Loading Supplied Anatomical GLB */}
      <Canvas
        shadows
        gl={{
          localClippingEnabled: true,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{
          background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F5F8FA 55%, #E9EFF4 100%)',
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.18, 4.0]} fov={42} />
        <OrbitControls
          ref={controlsRef}
          enableDamping={true}
          dampingFactor={0.06}
          minDistance={1.8}
          maxDistance={7.5}
          autoRotate={autoRotate && !isScanning && !reducedMotion}
          autoRotateSpeed={0.5}
        />

        {/* Clinical Lighting System & Subtle Dust */}
        <HolographicEnvironment showParticles={showParticles && !reducedMotion} />

        <Suspense fallback={null}>
          {/* Supplied VH_F_Uterus.glb Anatomical Mesh with Anatomical Part Separation */}
          <SuppliedUterusMesh
            crossSection={isCutaway}
            showAnatomy={showAnatomy}
            onHoverStructure={setHoveredStructure}
          />

          {/* Illustrative Lesion Geometry (Separately Managed Layer, Clearly Distinguished) */}
          {showLesion && (isCutaway || !showAnatomy) && (
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
        </Suspense>
      </Canvas>

      {/* 2. Top Header HUD Controls */}
      {showHudControls && (
        <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
          {/* Top Left: Model Identifier & Asset Notice */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#DDE7E5] shadow-xs pointer-events-auto">
            <Box className="w-4 h-4 text-[#2F8F83]" />
            <span className="font-extrabold tracking-wider text-xs text-[#20332F]">
              UTERUS 3D TWIN
            </span>
            <span className="text-[#71817D] font-light">|</span>
            <span className="text-[10px] font-semibold tracking-wider text-[#71817D] uppercase font-mono">
              UTERUS.GLB
            </span>
          </div>

          {/* Top Right: Cutaway vs 3D Mode Capsule Toggle */}
          <div className="flex items-center p-1 rounded-full bg-white/90 backdrop-blur-md border border-[#DDE7E5] shadow-xs pointer-events-auto">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[#E8F5F1] text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                  : 'text-[#71817D] hover:text-[#20332F]'
              }`}
              title="View full exterior anatomical model"
            >
              Full 3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cutaway')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cutaway'
                  ? 'bg-[#E8F5F1] text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                  : 'text-[#71817D] hover:text-[#20332F]'
              }`}
              title="Coronal cross-section view revealing internal endometrial cavity"
            >
              Coronal Cutaway
            </button>
          </div>
        </div>
      )}

      {/* 3. Left Floating Vertical Tool Pill (Restrained Neumorphic Toolbar) */}
      {showHudControls && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#DDE7E5] shadow-[0_4px_20px_rgba(32,51,47,0.06)] z-10 pointer-events-auto">
          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fit to View */}
          <button
            type="button"
            onClick={handleFitToView}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Fit Anatomy to Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-5 h-[1px] bg-[#DDE7E5] my-0.5" />

          {/* Zoom In (+) */}
          <button
            type="button"
            onClick={() => handleZoom(0.35)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out (-) */}
          <button
            type="button"
            onClick={() => handleZoom(-0.35)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="w-5 h-[1px] bg-[#DDE7E5] my-0.5" />

          {/* Toggle Anatomy Visibility */}
          <button
            type="button"
            onClick={() => setShowAnatomy(!showAnatomy)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              showAnatomy
                ? 'text-[#21685F] bg-[#E8F5F1]'
                : 'text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8]'
            }`}
            title={showAnatomy ? 'Hide Anatomical Model' : 'Show Anatomical Model'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Lesion Visibility */}
          <button
            type="button"
            onClick={() => setShowLesion(!showLesion)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              showLesion
                ? 'text-[#B77B36] bg-[#FEF7EE]'
                : 'text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8]'
            }`}
            title={showLesion ? 'Hide Illustrative Lesion' : 'Show Illustrative Lesion'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Bottom Hover Structure Tooltip / Synthetic Geometry Notice */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none z-10 text-[11px]">
        {/* Hovered Anatomical Structure Notification */}
        <div className="pointer-events-auto">
          {hoveredStructure ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#2F8F83]/40 text-[#20332F] font-medium shadow-xs animate-in fade-in duration-100">
              <span className="w-2 h-2 rounded-full bg-[#2F8F83]" />
              <span>Anatomy: <strong>{hoveredStructure}</strong></span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-white/80 backdrop-blur-md border border-[#DDE7E5] text-[#71817D] shadow-2xs">
              Click & drag to rotate • Scroll to zoom • Hover structures
            </span>
          )}
        </div>

        {/* Mandatory Illustrative Geometry Notice */}
        <div className="px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-[#E7ECEF] text-[#697780] text-[10px] shadow-2xs pointer-events-auto">
          Illustrative lesion geometry — synthetic demonstration
        </div>
      </div>
    </div>
  );
};
