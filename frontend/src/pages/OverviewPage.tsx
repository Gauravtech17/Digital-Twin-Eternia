import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { usePatient } from '../context/PatientContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { TwinStateVersion, Observation } from '../api/types';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { HolographicViewport } from '../components/twin/HolographicViewport';
import { ScanningModal } from '../components/simulation/ScanningModal';
import {
  Activity,
  Box,
  Play,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Radio,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { selectedPatient, reloadPatients, dataVersion } = usePatient();
  const { theme } = useTheme();

  const [twinState, setTwinState] = useState<TwinStateVersion | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Scanning Modal Trigger directly from Overview
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedPatient) return;
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        const [twin, obs] = await Promise.all([
          api.getCurrentTwinState(selectedPatient.id).catch(() => null),
          api.getObservations(selectedPatient.id).catch(() => []),
        ]);
        setTwinState(twin);
        setObservations(obs);
      } catch (e) {
        console.error('Failed to load overview data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadOverviewData();
  }, [selectedPatient?.id, dataVersion]);

  const latestObs = observations[observations.length - 1];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Hero Card: Selected Patient, Device Readiness, & Prominent Start Assessment */}
      <div className="bg-surface border border-theme rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] border border-[#BCE9F9] dark:border-[#2D4C5E]">
              Active Patient Track
            </span>
            <span className="text-xs text-text-muted font-mono">{selectedPatient?.mrn}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Device Status: Ready for Simulation
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {selectedPatient?.full_name}
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary">
            DOB: {selectedPatient?.date_of_birth} • Sex: {selectedPatient?.biological_sex} • Protocol: Longitudinal Polyp Surveillance
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#040304] text-white hover:bg-neutral-800 dark:bg-[#8FDBF6] dark:text-[#040304] dark:hover:bg-[#BCE9F9] text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2.5 group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
            <span>Start Assessment</span>
          </button>
          <Link
            to="/twin"
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-theme bg-surface-secondary hover:bg-surface-hover text-text text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Box className="w-4 h-4 text-[#563843] dark:text-[#8FDBF6]" />
            <span>Full 3D Twin</span>
          </Link>
        </div>
      </div>

      {/* 2. Central Split: Interactive 3D Digital Twin Preview & Longitudinal Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Twin Mini Preview Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-surface border border-theme rounded-3xl overflow-hidden shadow-xs flex flex-col h-[420px] relative">
          <div className="p-4 border-b border-theme flex items-center justify-between bg-surface-secondary/70 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#563843] dark:text-[#8FDBF6]" />
              <h2 className="text-xs font-bold text-text">Digital Twin 3D Viewport</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-theme text-text-muted">
                v{twinState?.version_number || 1}
              </span>
            </div>
            <Link
              to="/twin"
              className="text-xs font-semibold text-[#563843] dark:text-[#8FDBF6] hover:underline flex items-center gap-1"
            >
              <span>Explore in 3D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Holographic 3D Viewport */}
          <div className="flex-1 relative">
            <HolographicViewport
              lesionLengthMm={twinState?.lesion_length_mm || 10.8}
              lesionWidthMm={twinState?.lesion_width_mm || 7.4}
              lesionDepthMm={twinState?.lesion_depth_mm || 6.8}
              placementX={twinState?.placement_x || 0.18}
              placementY={twinState?.placement_y || 0.38}
              placementZ={twinState?.placement_z || -0.02}
              showAnnotation={false}
              autoRotate={true}
              showPedestal={false}
              showParticles={true}
              showHudControls={false}
              initialViewMode="cutaway"
              className="w-full h-full"
            />

            {/* Overlay hint */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] text-[#75F2FF]">
              <span className="bg-[#002438]/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-[#19D9FF]/30 shadow-xs">
                Drag to rotate • Scroll to zoom
              </span>
              <span className="bg-[#002438]/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-[#19D9FF]/30 shadow-xs">
                Holographic Cutaway Twin
              </span>
            </div>
          </div>
        </div>

        {/* Right: Key Status & Longitudinal Metrics (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Card: Current Lesion Dimensions */}
          <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-text-muted border-b border-theme pb-2">
              <span className="font-semibold text-text">Current Lesion Dimensions</span>
              <ProvenanceBadge type="DERIVED" size="xs" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-text-muted block">Longest Dimension (L)</span>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-text">
                  {twinState ? twinState.lesion_length_mm.toFixed(1) : '—'}{' '}
                  <span className="text-xs font-normal text-text-secondary">mm</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">Width Dimension (W)</span>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-text">
                  {twinState ? twinState.lesion_width_mm.toFixed(1) : '—'}{' '}
                  <span className="text-xs font-normal text-text-secondary">mm</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-theme flex items-center justify-between text-xs">
              <span className="text-text-muted">Derived Volume (Ellipsoid):</span>
              <span className="font-mono font-bold tabular-nums text-[#BD473B] dark:text-[#E0AEB2]">
                {twinState?.lesion_volume_mm3 ? `${twinState.lesion_volume_mm3.toFixed(1)} mm³` : '—'}
              </span>
            </div>
          </div>

          {/* Card: Longitudinal Growth Rate */}
          <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-text-muted border-b border-theme pb-2">
              <span className="font-semibold text-text">Serial Growth Velocity</span>
              <ProvenanceBadge type="DERIVED" size="xs" />
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-extrabold font-mono tabular-nums text-text">
                  {twinState?.growth_rate_mm_per_month !== null && twinState?.growth_rate_mm_per_month !== undefined
                    ? `${twinState.growth_rate_mm_per_month >= 0 ? '+' : ''}${twinState.growth_rate_mm_per_month.toFixed(2)}`
                    : 'Baseline'}
                </span>
                <span className="text-xs font-medium text-text-secondary ml-1">mm / month</span>
              </div>
              <span className="text-[10px] text-text-muted font-mono">
                {twinState?.elapsed_days_since_previous
                  ? `Interval: ${twinState.elapsed_days_since_previous} days`
                  : '≥ 2 serial observations'}
              </span>
            </div>

            <p className="text-[11px] text-text-muted pt-1">
              Delta longest dimension: {twinState?.delta_longest_dimension_mm !== undefined
                ? `${twinState.delta_longest_dimension_mm >= 0 ? '+' : ''}${twinState.delta_longest_dimension_mm.toFixed(1)} mm`
                : 'Baseline observation'}
            </p>
          </div>

          {/* Card: Latest Observation & Device Sync */}
          <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-theme pb-2">
              <span className="font-semibold text-text">Latest Recorded Observation</span>
              <span className="text-[10px] font-mono text-text-muted">
                {observations.length} Scans on File
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-muted">Observation Date:</span>
              <span className="font-mono font-medium text-text">
                {latestObs ? new Date(latestObs.observed_at).toLocaleDateString() : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Data Source:</span>
              <ProvenanceBadge type={latestObs?.source || 'SIMULATED'} size="xs" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Measurement Confidence:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                {latestObs ? `${(latestObs.measurement_confidence * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Research & Non-Claim Regulatory Notice */}
      <div className="bg-surface border border-theme rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#563843] dark:text-[#E0AEB2] shrink-0" />
          <span>
            <strong>Academic Proof-of-Concept Notice:</strong> POLYPULSE is not clinically certified and provides no medical diagnosis or malignancy evaluation. 3D models and ultrasound viewports are synthetic software simulations.
          </span>
        </div>
        <Link
          to="/observations"
          className="text-xs font-semibold text-[#563843] dark:text-[#8FDBF6] hover:underline shrink-0 hidden sm:block"
        >
          View Full Timeline →
        </Link>
      </div>

      {/* Scanning Modal if triggered from Overview */}
      {selectedPatient && (
        <ScanningModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          patient={selectedPatient}
          durationSeconds={10}
          onAssessmentCompleted={async () => {
            await reloadPatients();
            const [twin, obs] = await Promise.all([
              api.getCurrentTwinState(selectedPatient.id).catch(() => null),
              api.getObservations(selectedPatient.id).catch(() => []),
            ]);
            setTwinState(twin);
            setObservations(obs);
          }}
        />
      )}
    </div>
  );
};
