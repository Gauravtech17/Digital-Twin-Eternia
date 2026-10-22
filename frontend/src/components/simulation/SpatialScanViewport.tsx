import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SuppliedUterusMesh } from '../twin/SuppliedUterusMesh';
import { HolographicEnvironment } from '../twin/HolographicEnvironment';
import { GridScanController } from './GridScanController';
import { CandidateDetectionPanel } from './CandidateDetectionPanel';
import {
  generateScanPath,
  ScanStep,
  DEFAULT_SCAN_PATH_CONFIG,
  DEFAULT_SYNTHETIC_TARGET,
  SyntheticTargetConfig,
} from './ScanPathGenerator';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Box,
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  Radio,
  CheckCircle2,
  AlertCircle,
  Eye,
  Activity,
} from 'lucide-react';

export type SpatialScanState =
  | 'idle'
  | 'preparing'
  | 'scanning'
  | 'candidate_found'
  | 'processing'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'error';

export interface SpatialScanViewportProps {
  durationSeconds?: number;
  targetLengthMm?: number;
  targetWidthMm?: number;
  targetDepthMm?: number;
  onCandidateEncountered?: (step: ScanStep) => void;
  onScanCompleted?: () => void;
  onInspectInTwin?: () => void;
  autoStart?: boolean;
  className?: string;
  showHudControls?: boolean;
}

export const SpatialScanViewport: React.FC<SpatialScanViewportProps> = ({
  durationSeconds = 10,
  targetLengthMm = 10.8,
  targetWidthMm = 7.4,
  targetDepthMm = 6.8,
  onCandidateEncountered,
  onScanCompleted,
  onInspectInTwin,
  autoStart = false,
  className = 'w-full h-full min-h-[460px]',
  showHudControls = true,
}) => {
  // Pre-generate deterministic 42-step serpentine raster scan path
  const scanSteps = useRef<ScanStep[]>(generateScanPath(DEFAULT_SCAN_PATH_CONFIG)).current;
  const totalSteps = scanSteps.length;

  // State Machine
  const [scanState, setScanState] = useState<SpatialScanState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [candidateIdentified, setCandidateIdentified] = useState<boolean>(false);
  const [crossSection, setCrossSection] = useState<boolean>(true);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // References for animation timers
  const controlsRef = useRef<any>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<SpatialScanState>('idle');
  stateRef.current = scanState;

  const currentStepIndexRef = useRef<number>(-1);
  currentStepIndexRef.current = currentStepIndex;

  const candidateIdentifiedRef = useRef<boolean>(false);
  candidateIdentifiedRef.current = candidateIdentified;

  const completedStepsRef = useRef<number[]>([]);
  completedStepsRef.current = completedSteps;

  // Calculate step interval based on target duration
  // Reserve ~1.2s for candidate dwell and processing
  const baseStepIntervalMs = Math.max(
    140,
    Math.round(((durationSeconds * 1000) - 1400) / Math.max(1, totalSteps))
  );

  // Clear active timers
  const clearTimers = useCallback(() => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  // Advance single step in the raster scanning path
  const executeStep = useCallback((stepIdx: number) => {
    if (stepIdx >= totalSteps) {
      // Completed all steps in the planned raster path
      setScanState('processing');
      stepTimerRef.current = setTimeout(() => {
        setScanState('completed');
        if (onScanCompleted) onScanCompleted();
      }, 700);
      return;
    }

    setCurrentStepIndex(stepIdx);
    const step = scanSteps[stepIdx];

    // Check deterministic target intersection
    if (step.isTargetIntersection && !candidateIdentifiedRef.current) {
      setCandidateIdentified(true);
      setScanState('candidate_found');
      if (onCandidateEncountered) {
        onCandidateEncountered(step);
      }

      // Candidate dwell: pause briefly for clinical inspection (~1.2s dwell)
      stepTimerRef.current = setTimeout(() => {
        // Record completed step
        setCompletedSteps((prev) => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
        setScanState('scanning');
        executeStep(stepIdx + 1);
      }, 1250);
      return;
    }

    // Normal step dwell
    stepTimerRef.current = setTimeout(() => {
      // Record completed step
      setCompletedSteps((prev) => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
      executeStep(stepIdx + 1);
    }, baseStepIntervalMs);
  }, [totalSteps, scanSteps, baseStepIntervalMs, onCandidateEncountered, onScanCompleted]);

  // Controls: Start
  const handleStartScan = useCallback(() => {
    clearTimers();
    setCompletedSteps([]);
    setCandidateIdentified(false);
    setCurrentStepIndex(0);
    setScanState('scanning');
    executeStep(0);
  }, [clearTimers, executeStep]);

  // Controls: Pause
  const handlePauseScan = useCallback(() => {
    clearTimers();
    setScanState('paused');
  }, [clearTimers]);

  // Controls: Resume
  const handleResumeScan = useCallback(() => {
    if (stateRef.current !== 'paused') return;
    const nextIdx = currentStepIndexRef.current >= 0 ? currentStepIndexRef.current : 0;
    setScanState('scanning');
    executeStep(nextIdx);
  }, [executeStep]);

  // Controls: Restart
  const handleRestartScan = useCallback(() => {
    clearTimers();
    handleStartScan();
  }, [clearTimers, handleStartScan]);

  // Controls: Cancel
  const handleCancelScan = useCallback(() => {
    clearTimers();
    setScanState('cancelled');
  }, [clearTimers]);

  // Controls: Manual Step Forward
  const handleStepForward = useCallback(() => {
    clearTimers();
    const nextIdx = currentStepIndexRef.current + 1;
    if (nextIdx < totalSteps) {
      setCurrentStepIndex(nextIdx);
      setCompletedSteps((prev) => (prev.includes(nextIdx) ? prev : [...prev, nextIdx]));
      const step = scanSteps[nextIdx];
      if (step.isTargetIntersection) {
        setCandidateIdentified(true);
      }
    } else {
      setScanState('completed');
    }
  }, [clearTimers, totalSteps, scanSteps]);

  // Controls: Camera
  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.18, 4.0);
    controlsRef.current.target.set(0, 0.05, 0);
    controlsRef.current.update();
  };

  const handleFitToView = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.15, 3.4);
    controlsRef.current.target.set(0, 0.05, 0);
    controlsRef.current.update();
  };

  const handleSetViewAngle = (angle: 'coronal' | 'sagittal' | 'superior') => {
    if (!controlsRef.current) return;
    if (angle === 'coronal') {
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

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        handleStartScan();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoStart, handleStartScan]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Derived progress calculations
  const coveragePercent = Math.min(100, Math.round((completedSteps.length / totalSteps) * 100));
  const activeStep = currentStepIndex >= 0 && currentStepIndex < totalSteps ? scanSteps[currentStepIndex] : null;

  return (
    <div className={`relative overflow-hidden rounded-3xl select-none ${className} bg-[#F8FAFC]`}>
      {/* 1. Three.js WebGL Scene */}
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
        />

        <HolographicEnvironment showParticles={true} />

        <Suspense fallback={null}>
          {/* Authoritative Anatomical Model uterus.glb */}
          <SuppliedUterusMesh
            crossSection={crossSection}
            showAnatomy={true}
            onHoverStructure={setHoveredRegion}
          />

          {/* Spatial Grid Scanning Controller & Illustrative Polyp */}
          <GridScanController
            scanSteps={scanSteps}
            activeStepIndex={currentStepIndex}
            completedStepIndices={completedSteps}
            targetConfig={DEFAULT_SYNTHETIC_TARGET}
            isScanning={scanState === 'scanning' || scanState === 'candidate_found'}
            isPaused={scanState === 'paused'}
            candidateFound={candidateIdentified}
            targetLengthMm={targetLengthMm}
            targetWidthMm={targetWidthMm}
            targetDepthMm={targetDepthMm}
          />
        </Suspense>
      </Canvas>

      {/* 2. Top Header HUD Overlay */}
      {showHudControls && (
        <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
          {/* Left: Model Asset Notice */}
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

          {/* Center: Live Scanning Status Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#DDE7E5] shadow-xs pointer-events-auto">
            <span
              className={`w-2 h-2 rounded-full ${
                scanState === 'scanning'
                  ? 'bg-[#2F8F83] animate-ping'
                  : scanState === 'candidate_found'
                  ? 'bg-[#B77B36] animate-pulse'
                  : scanState === 'completed'
                  ? 'bg-[#21685F]'
                  : scanState === 'paused'
                  ? 'bg-[#B77B36]'
                  : 'bg-[#71817D]'
              }`}
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#20332F] uppercase">
              {scanState === 'scanning'
                ? 'SIMULATION ACTIVE'
                : scanState === 'candidate_found'
                ? 'CANDIDATE ENCOUNTERED'
                : scanState === 'completed'
                ? 'SCAN COMPLETED'
                : scanState === 'paused'
                ? 'SIMULATION PAUSED'
                : 'STANDBY — READY'}
            </span>
            <span className="text-[#71817D] font-light">|</span>
            <span className="text-[10px] font-mono text-[#71817D] tabular-nums font-semibold">
              Step {Math.max(0, currentStepIndex + 1)} / {totalSteps} ({coveragePercent}%)
            </span>
          </div>

          {/* Right: Cutaway vs Full 3D Mode Capsule Toggle */}
          <div className="flex items-center p-1 rounded-full bg-white/90 backdrop-blur-md border border-[#DDE7E5] shadow-xs pointer-events-auto">
            <button
              type="button"
              onClick={() => setCrossSection(false)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !crossSection
                  ? 'bg-[#E8F5F1] text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                  : 'text-[#71817D] hover:text-[#20332F]'
              }`}
            >
              Full 3D
            </button>
            <button
              type="button"
              onClick={() => setCrossSection(true)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                crossSection
                  ? 'bg-[#E8F5F1] text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                  : 'text-[#71817D] hover:text-[#20332F]'
              }`}
            >
              Coronal Cutaway
            </button>
          </div>
        </div>
      )}

      {/* 3. Left Floating Camera Tool Pill */}
      {showHudControls && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#DDE7E5] shadow-sm z-10 pointer-events-auto">
          <button
            type="button"
            onClick={handleResetCamera}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitToView}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Fit to View"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
          <div className="w-5 h-[1px] bg-[#DDE7E5] my-0.5" />
          <button
            type="button"
            onClick={() => handleSetViewAngle('coronal')}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Coronal View"
          >
            COR
          </button>
          <button
            type="button"
            onClick={() => handleSetViewAngle('sagittal')}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Sagittal View"
          >
            SAG
          </button>
          <button
            type="button"
            onClick={() => handleSetViewAngle('superior')}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Superior View"
          >
            SUP
          </button>
        </div>
      )}

      {/* 4. Bottom Center Scanning Playback Controls Toolbar */}
      {showHudControls && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#DDE7E5] shadow-lg z-10 pointer-events-auto">
          {scanState === 'scanning' || scanState === 'candidate_found' ? (
            <button
              type="button"
              onClick={handlePauseScan}
              className="px-4 py-2 rounded-xl bg-[#21685F] text-white hover:bg-[#1A534C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Pause className="w-3.5 h-3.5 fill-current text-[#B77B36]" />
              <span>Pause Scan</span>
            </button>
          ) : scanState === 'paused' ? (
            <button
              type="button"
              onClick={handleResumeScan}
              className="px-4 py-2 rounded-xl bg-[#21685F] text-white hover:bg-[#1A534C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#E8F5F1]" />
              <span>Resume Scan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartScan}
              className="px-4 py-2 rounded-xl bg-[#21685F] text-white hover:bg-[#1A534C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#E8F5F1]" />
              <span>{scanState === 'completed' ? 'Re-run Scan' : 'Start Scan'}</span>
            </button>
          )}

          {/* Step Forward Button (Manual inspection) */}
          <button
            type="button"
            onClick={handleStepForward}
            disabled={scanState === 'scanning' || scanState === 'candidate_found'}
            className="p-2 rounded-xl text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] disabled:opacity-30 transition-colors cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset / Restart */}
          <button
            type="button"
            onClick={handleRestartScan}
            className="p-2 rounded-xl text-[#71817D] hover:text-[#20332F] hover:bg-[#F5F9F8] transition-colors cursor-pointer"
            title="Restart Scan from Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Current Row/Col Meta */}
          {activeStep && (
            <div className="pl-2 border-l border-[#DDE7E5] text-[10px] font-mono text-[#71817D]">
              <span className="font-bold text-[#20332F]">
                Row {activeStep.row + 1} / 6
              </span>{' '}
              • Col {activeStep.col + 1} / 7
            </div>
          )}
        </div>
      )}

      {/* 5. Bottom Right Candidate Detection Panel */}
      {candidateIdentified && (
        <div className="absolute bottom-5 right-5 z-20 max-w-sm pointer-events-auto">
          <CandidateDetectionPanel
            candidateFound={candidateIdentified}
            candidateId={DEFAULT_SYNTHETIC_TARGET.id}
            lengthMm={targetLengthMm}
            widthMm={targetWidthMm}
            depthMm={targetDepthMm}
            onInspectInTwin={onInspectInTwin}
            isScanning={scanState === 'scanning' || scanState === 'candidate_found'}
            isCompleted={scanState === 'completed'}
          />
        </div>
      )}
    </div>
  );
};
