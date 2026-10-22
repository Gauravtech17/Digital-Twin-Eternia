import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { usePatient } from '../../context/PatientContext';
import { Patient, SimulationIngestResponse } from '../../api/types';
import { SpatialScanViewport } from './SpatialScanViewport';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Box,
  Clock,
  Radio,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Activity,
} from 'lucide-react';

export type AssessmentLifecycle =
  | 'INITIALIZING'
  | 'ACTIVE_SCANNING'
  | 'LESION_ANALYSIS'
  | 'SAVING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

interface ScanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  durationSeconds: number;
  onAssessmentCompleted: (res: SimulationIngestResponse) => void;
  targetLengthMm?: number;
  targetWidthMm?: number;
  targetDepthMm?: number;
}

const PHASES_CONFIG = [
  {
    key: 'INITIALIZING',
    stepNumber: '01',
    title: 'Initializing',
    badgeText: 'INITIALIZING SCAN',
    desc: '3D anatomical twin aligns; clean clinical illumination engages',
    range: [0, 0.2],
  },
  {
    key: 'ACTIVE_SCANNING',
    stepNumber: '02',
    title: 'Active Scanning',
    badgeText: 'SCANNING ANATOMICAL REGION',
    desc: 'Ultrasound transducer sweeps across myometrium and endometrial contours',
    range: [0.2, 0.75],
  },
  {
    key: 'LESION_ANALYSIS',
    stepNumber: '03',
    title: 'Lesion Analysis',
    badgeText: 'PROCESSING SYNTHETIC MEASUREMENTS',
    desc: 'Targeting endometrial polyp; extracting multi-axial calipers and volumetric synthesis',
    range: [0.75, 1.0],
  },
  {
    key: 'SAVING',
    stepNumber: '04',
    title: 'Persistence',
    badgeText: 'SAVING ASSESSMENT',
    desc: 'Committing observation, updating digital twin state, and logging audit record',
    range: [1.0, 1.0],
  },
  {
    key: 'COMPLETED',
    stepNumber: '05',
    title: 'Completion',
    badgeText: 'ASSESSMENT SAVED',
    desc: 'Digital twin state versioned and synchronized with persisted measurements',
    range: [1.0, 1.0],
  },
];

export const ScanningModal: React.FC<ScanningModalProps> = ({
  isOpen,
  onClose,
  patient,
  durationSeconds,
  onAssessmentCompleted,
  targetLengthMm = 10.8,
  targetWidthMm = 7.4,
  targetDepthMm = 6.8,
}) => {
  const navigate = useNavigate();
  const { reloadPatients, notifyDataChanged } = usePatient();
  const animFrameRef = useRef<number | null>(null);

  // Persistent reference handles to avoid re-triggering effects on parent re-renders
  const onAssessmentCompletedRef = useRef(onAssessmentCompleted);
  onAssessmentCompletedRef.current = onAssessmentCompleted;

  const patientRef = useRef(patient);
  patientRef.current = patient;

  const durationSecondsRef = useRef(durationSeconds);
  durationSecondsRef.current = durationSeconds;

  const targetLengthMmRef = useRef(targetLengthMm);
  targetLengthMmRef.current = targetLengthMm;

  const targetWidthMmRef = useRef(targetWidthMm);
  targetWidthMmRef.current = targetWidthMm;

  const targetDepthMmRef = useRef(targetDepthMm);
  targetDepthMmRef.current = targetDepthMm;

  const reloadPatientsRef = useRef(reloadPatients);
  reloadPatientsRef.current = reloadPatients;

  const notifyDataChangedRef = useRef(notifyDataChanged);
  notifyDataChangedRef.current = notifyDataChanged;

  // Holographic Assessment Lifecycle State Machine
  const [lifecycle, setLifecycle] = useState<AssessmentLifecycle>('INITIALIZING');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [scanPlaneProgress, setScanPlaneProgress] = useState<number>(0);
  const [result, setResult] = useState<SimulationIngestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persistent idempotency key for safe retries
  const sessionKeyRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const hasTriggeredSaveRef = useRef<boolean>(false);

  // Calculated derived volume preview (pi / 6 * L * W * D)
  const previewVolume = ((Math.PI / 6) * targetLengthMm * targetWidthMm * targetDepthMm).toFixed(1);

  // Execute Backend Persistence (Phase 4 -> Phase 5 or Error)
  const executePersistence = useCallback(async () => {
    setLifecycle('SAVING');

    try {
      const observedAtIso = new Date().toISOString();
      const currentPatient = patientRef.current;
      const curL = targetLengthMmRef.current;
      const curW = targetWidthMmRef.current;
      const curD = targetDepthMmRef.current;
      const curDuration = durationSecondsRef.current;

      const res = await api.ingestSimulation({
        idempotency_key: sessionKeyRef.current,
        patient_id: currentPatient.id,
        observed_at: observedAtIso,
        source: 'SIMULATED_STREAM',
        length_mm: curL,
        width_mm: curW,
        depth_mm: curD,
        missing_depth_assumption: 'ASSUME_DEPTH_EQUALS_WIDTH',
        measurement_confidence: 0.94,
        image_quality: 0.91,
        notes: `Simulated scan assessment (${curDuration}s duration) via POLYPULSE Wearable Stand-in`,
      });

      setResult(res);
      setLifecycle('COMPLETED');
      if (onAssessmentCompletedRef.current) {
        onAssessmentCompletedRef.current(res);
      }
      try {
        if (reloadPatientsRef.current) await reloadPatientsRef.current();
        if (notifyDataChangedRef.current) notifyDataChangedRef.current();
      } catch (e) {
        console.error('Failed to notify data change:', e);
      }
    } catch (err: any) {
      console.error('Holographic assessment persistence error:', err);
      setErrorMessage(err.message || 'Failed to persist observation to digital twin backend.');
      setLifecycle('ERROR');
    }
  }, []);

  // Start Holographic Scanning Loop
  const startScanningLoop = useCallback(() => {
    const currentPatient = patientRef.current;
    sessionKeyRef.current = `scan-${currentPatient.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    startTimeRef.current = performance.now();
    isRunningRef.current = true;
    hasTriggeredSaveRef.current = false;
    setLifecycle('INITIALIZING');
    setElapsedSeconds(0);
    setProgressPercent(0);
    setScanPlaneProgress(0);
    setResult(null);
    setErrorMessage(null);

    const updateTimer = () => {
      if (!isRunningRef.current) return;

      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const duration = durationSecondsRef.current;
      const progress = Math.min(1.0, elapsed / duration);

      setElapsedSeconds(Math.min(duration, elapsed));
      setProgressPercent(Math.round(progress * 100));

      // Map progress to Phases (1: 0-0.2, 2: 0.2-0.75, 3: 0.75-1.0, 4: 1.0 Persistence)
      if (progress < 0.2) {
        setLifecycle((prev) => (prev === 'INITIALIZING' ? prev : 'INITIALIZING'));
        setScanPlaneProgress(0);
      } else if (progress < 0.75) {
        setLifecycle((prev) => (prev === 'ACTIVE_SCANNING' ? prev : 'ACTIVE_SCANNING'));
        const p = (progress - 0.2) / 0.55;
        setScanPlaneProgress(Math.min(1.0, Math.max(0.0, p)));
      } else if (progress < 1.0) {
        setLifecycle((prev) => (prev === 'LESION_ANALYSIS' ? prev : 'LESION_ANALYSIS'));
        setScanPlaneProgress(1.0);
      } else {
        // Countdown reached: Transition to Phase 4 (Persistence)
        if (!hasTriggeredSaveRef.current) {
          hasTriggeredSaveRef.current = true;
          isRunningRef.current = false;
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          setLifecycle('SAVING');
          executePersistence();
          return;
        }
      }

      if (isRunningRef.current) {
        animFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateTimer);
  }, [executePersistence]);

  useEffect(() => {
    if (isOpen) {
      startScanningLoop();
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      isRunningRef.current = false;
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [isOpen]);

  const handleCancel = () => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setLifecycle('CANCELLED');
  };

  if (!isOpen) return null;

  const currentPhaseConfig =
    PHASES_CONFIG.find((p) => p.key === lifecycle) || PHASES_CONFIG[0];

  const remainingSeconds = Math.max(0, Math.ceil(durationSeconds - elapsedSeconds));



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface border border-theme rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* 1. Modal Top Bar */}
        <div className="px-6 py-4 border-b border-theme flex items-center justify-between bg-surface-secondary/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5F1] border border-[#DDE7E5] flex items-center justify-center text-[#21685F]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-text tracking-wide">
                  Digital Twin Assessment Session
                </h2>
                <span className="text-[10px] font-mono uppercase bg-[#E8F5F1] text-[#21685F] px-2 py-0.5 rounded-full border border-[#DDE7E5] font-bold">
                  SIMULATION
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Patient: <span className="font-semibold text-text">{patient.full_name}</span> ({patient.mrn}) • Wearable Ultrasound Stand-in
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={lifecycle === 'ACTIVE_SCANNING' || lifecycle === 'INITIALIZING' ? handleCancel : onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Main Central Workspace Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3D Spatial Grid Scanning Viewport (7 Cols) */}
          <div className="lg:col-span-7 bg-[#F5F9F8] border border-theme rounded-3xl overflow-hidden flex flex-col h-[400px] sm:h-[460px] relative shadow-inner">
            <SpatialScanViewport
              durationSeconds={durationSeconds}
              targetLengthMm={targetLengthMm}
              targetWidthMm={targetWidthMm}
              targetDepthMm={targetDepthMm}
              autoStart={true}
              onCandidateEncountered={() => {
                setLifecycle('LESION_ANALYSIS');
              }}
              onScanCompleted={() => {
                if (!hasTriggeredSaveRef.current) {
                  hasTriggeredSaveRef.current = true;
                  isRunningRef.current = false;
                  executePersistence();
                }
              }}
              onInspectInTwin={() => {
                onClose();
                navigate('/twin');
              }}
              className="w-full h-full"
            />
          </div>

          {/* Right: Telemetry & Countdown Widget (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Countdown Clock & Circular Progress Widget */}
            <div className="p-5 rounded-3xl bg-surface border border-theme shadow-xs flex flex-col items-center justify-center relative overflow-hidden">
              {/* Radial Progress Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#DDE7E5"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={
                      lifecycle === 'COMPLETED'
                        ? '#21685F'
                        : lifecycle === 'ERROR'
                        ? '#B84C4C'
                        : '#2F8F83'
                    }
                    strokeWidth="6"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-150 ease-out"
                  />
                </svg>

                {/* Center Countdown Display */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono tracking-tight text-text tabular-nums">
                    00:{remainingSeconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {progressPercent}% Complete
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 bg-[#E8F5F1] text-[#21685F] border border-[#DDE7E5]">
                    {lifecycle}
                  </span>
                </div>
              </div>

              {/* Phase Headline Description */}
              <div className="text-center mt-3 space-y-1">
                <h4 className="text-xs font-bold text-text tracking-wide">
                  {currentPhaseConfig.title}
                </h4>
                <p className="text-[11px] text-text-secondary leading-relaxed max-w-xs">
                  {currentPhaseConfig.desc}
                </p>
              </div>
            </div>

            {/* Extracted Calipers Card */}
            <div className="p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-theme pb-2">
                <span className="text-[11px] font-bold uppercase text-text tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#2F8F83]" />
                  Extracted Lesion Calipers
                </span>
                <span className="text-[10px] font-mono text-text-muted">Synthetic</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-surface-secondary border border-theme">
                  <span className="text-[9px] text-text-muted block font-sans">Length (L)</span>
                  <span className="font-bold text-sm text-text tabular-nums">
                    {targetLengthMm.toFixed(1)} <span className="text-[9px] text-text-muted font-normal">mm</span>
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-secondary border border-theme">
                  <span className="text-[9px] text-text-muted block font-sans">Width (W)</span>
                  <span className="font-bold text-sm text-text tabular-nums">
                    {targetWidthMm.toFixed(1)} <span className="text-[9px] text-text-muted font-normal">mm</span>
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-secondary border border-theme">
                  <span className="text-[9px] text-text-muted block font-sans">Volume (V)</span>
                  <span className="font-bold text-sm text-[#B77B36] tabular-nums">
                    {previewVolume} <span className="text-[9px] text-text-muted font-normal">mm³</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Five-Phase Progression Tracker */}
        <div className="px-6 py-3 border-t border-theme bg-surface-secondary/40">
          <div className="grid grid-cols-5 gap-2 text-[10px]">
            {PHASES_CONFIG.map((p, idx) => {
              const isCurrent = p.key === lifecycle;
              const isPast =
                (lifecycle === 'ACTIVE_SCANNING' && idx < 1) ||
                (lifecycle === 'LESION_ANALYSIS' && idx < 2) ||
                (lifecycle === 'SAVING' && idx < 3) ||
                (lifecycle === 'COMPLETED' && idx < 5);

              return (
                <div
                  key={p.key}
                  className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-[#2F8F83] bg-[#E8F5F1] text-[#21685F] font-bold shadow-xs'
                      : isPast
                      ? 'border-[#2F8F83]/40 bg-[#E8F5F1]/50 text-[#21685F]'
                      : 'border-theme bg-surface text-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-[9px] opacity-70">PHASE {p.stepNumber}</span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-[#21685F]" />}
                  </div>
                  <span className="truncate">{p.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Persistence Outcome & Action Tray */}
        <div className="px-6 py-4 border-t border-theme flex flex-wrap items-center justify-between gap-4 bg-surface-secondary/70">
          {/* Status Message or Error Display */}
          <div className="flex items-center gap-2 text-xs">
            {lifecycle === 'ERROR' ? (
              <div className="flex items-center gap-2 text-[#B84C4C]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            ) : lifecycle === 'SAVING' ? (
              <div className="flex items-center gap-2 text-[#2F8F83]">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Transmitting observation to digital twin database...</span>
              </div>
            ) : lifecycle === 'COMPLETED' ? (
              <div className="flex items-center gap-2 text-[#21685F]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-semibold">
                  Observation committed! Twin updated to version v{result?.twin_version.version_number}.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono">
                <Radio className="w-3.5 h-3.5 text-[#2F8F83]" />
                <span>Simulated Ultrasound Transducer Streaming Active</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {lifecycle === 'ERROR' && (
              <button
                type="button"
                onClick={executePersistence}
                className="px-4 py-2 rounded-xl bg-[#B84C4C] hover:bg-[#A33B3B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Save</span>
              </button>
            )}

            {lifecycle === 'COMPLETED' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/twin');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#21685F] text-white hover:bg-[#1A534C] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Box className="w-3.5 h-3.5 text-white/90" />
                  <span>Inspect in Digital Twin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/observations');
                  }}
                  className="px-4 py-2 rounded-xl border border-theme bg-surface hover:bg-surface-secondary text-text text-xs font-semibold transition-all cursor-pointer"
                >
                  View in Observations
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl text-text-secondary hover:text-text text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                disabled={lifecycle === 'SAVING'}
                className="px-4 py-2 rounded-xl border border-theme text-text-secondary hover:text-text hover:bg-surface text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
