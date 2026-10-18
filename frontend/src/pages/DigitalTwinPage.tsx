import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { usePatient } from '../context/PatientContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { TwinStateVersion, Observation } from '../api/types';
import { HolographicViewport } from '../components/twin/HolographicViewport';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  RotateCcw,
  Calendar,
  Layers,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Box,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DigitalTwinPage: React.FC = () => {
  const { selectedPatient, dataVersion } = usePatient();
  const { theme } = useTheme();

  const [versions, setVersions] = useState<TwinStateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<TwinStateVersion | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Modes: 'cross' (default cutaway) | 'front' | 'side'
  const [viewMode, setViewMode] = useState<'cross' | 'front' | 'side'>('cross');
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedPatient) return;
    const loadTwinData = async () => {
      try {
        setLoading(true);
        const [vList, obsList] = await Promise.all([
          api.getTwinVersions(selectedPatient.id).catch(() => []),
          api.getObservations(selectedPatient.id).catch(() => []),
        ]);
        setVersions(vList);
        setObservations(obsList);
        if (vList.length > 0) {
          // Default to latest version
          setSelectedVersion(vList[vList.length - 1]);
        } else {
          setSelectedVersion(null);
        }
      } catch (e) {
        console.error('Failed to load digital twin states:', e);
      } finally {
        setLoading(false);
      }
    };
    loadTwinData();
  }, [selectedPatient?.id, dataVersion]);

  // Camera orientation handler
  const setCameraView = (mode: 'cross' | 'front' | 'side') => {
    setViewMode(mode);
    if (!controlsRef.current) return;

    if (mode === 'cross') {
      controlsRef.current.object.position.set(0, 0.35, 4.2);
      controlsRef.current.target.set(0, 0.12, 0);
    } else if (mode === 'front') {
      controlsRef.current.object.position.set(0, 0, 4.6);
      controlsRef.current.target.set(0, 0, 0);
    } else if (mode === 'side') {
      controlsRef.current.object.position.set(4.6, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
    }
    controlsRef.current.update();
  };

  const resetCamera = () => {
    setCameraView('cross');
  };

  // Find observation that generated selected version
  const generatingObs = observations.find(
    (o) => o.id === selectedVersion?.observation_id
  );

  // Check if selected version is latest
  const isLatestVersion =
    versions.length > 0 && selectedVersion?.id === versions[versions.length - 1].id;

  // Baseline version (v1)
  const baselineVersion = versions.length > 0 ? versions[0] : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Digital Twin Visualizer
            </h1>
            <span className="text-[10px] font-mono uppercase bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] px-2 py-0.5 rounded border border-[#BCE9F9] dark:border-[#2D4C5E] font-bold">
              Living 3D Model
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Synchronized with persisted TwinStateVersion {selectedVersion?.version_number || 1} • {selectedPatient?.full_name} ({selectedPatient?.mrn})
          </p>
        </div>

        {/* Mandatory Illustrative Anatomy Disclaimer Notice */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-theme bg-surface text-text-secondary text-[11px] shadow-xs">
          <Info className="w-3.5 h-3.5 text-[#563843] dark:text-[#E0AEB2] shrink-0" />
          <span>
            Procedural anatomical twin — calibrated scale from recorded observation.
          </span>
        </div>
      </div>

      {/* Main 3D Stage Card */}
      <div className="bg-surface border border-theme rounded-3xl overflow-hidden shadow-xs relative flex flex-col h-[640px]">
        {/* Holographic 3D Viewport with Integrated Controls */}
        <div className="flex-1 w-full h-full relative">
          <HolographicViewport
            lesionLengthMm={selectedVersion?.lesion_length_mm || 10.8}
            lesionWidthMm={selectedVersion?.lesion_width_mm || 7.4}
            lesionDepthMm={selectedVersion?.lesion_depth_mm || 6.8}
            placementX={selectedVersion?.placement_x || 0.18}
            placementY={selectedVersion?.placement_y || 0.38}
            placementZ={selectedVersion?.placement_z || -0.02}
            showAnnotation={true}
            autoRotate={false}
            showPedestal={false}
            showParticles={true}
            showHudControls={true}
            initialViewMode="cutaway"
            className="w-full h-full"
          />

          {isLatestVersion && (
            <div className="absolute top-4 right-4 z-10 pointer-events-none">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#19D9FF] bg-[#002438]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#19D9FF]/40 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#19D9FF] animate-ping" />
                LATEST TWIN UPDATE (v{selectedVersion?.version_number})
              </span>
            </div>
          )}
        </div>

        {/* Floating Telemetry & Longitudinal Comparison Box (Bottom Right) */}
        <div className="absolute bottom-20 sm:bottom-24 right-4 z-10 max-w-sm w-full bg-surface/95 backdrop-blur-md border border-theme rounded-2xl p-4 shadow-lg text-xs space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-theme pb-2">
            <div>
              <span className="font-bold text-text">Lesion State Telemetry</span>
              <span className="text-[10px] text-text-muted ml-1.5 font-mono">
                State v{selectedVersion?.version_number}
              </span>
            </div>
            <ProvenanceBadge type={generatingObs?.source || 'DERIVED'} size="xs" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-text-muted">Longest (L):</span>
              <div className="font-mono font-bold text-text text-sm tabular-nums">
                {selectedVersion ? `${selectedVersion.lesion_length_mm.toFixed(1)} mm` : '—'}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Width (W):</span>
              <div className="font-mono font-bold text-text text-sm tabular-nums">
                {selectedVersion ? `${selectedVersion.lesion_width_mm.toFixed(1)} mm` : '—'}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Derived Volume:</span>
              <div className="font-mono font-bold text-[#BD473B] dark:text-[#E0AEB2] text-sm tabular-nums">
                {selectedVersion?.lesion_volume_mm3
                  ? `${selectedVersion.lesion_volume_mm3.toFixed(1)} mm³`
                  : 'Omitted'}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Growth Rate:</span>
              <div className="font-mono font-bold text-text text-sm tabular-nums">
                {selectedVersion?.growth_rate_mm_per_month !== null && selectedVersion?.growth_rate_mm_per_month !== undefined
                  ? `${selectedVersion.growth_rate_mm_per_month >= 0 ? '+' : ''}${selectedVersion.growth_rate_mm_per_month.toFixed(2)} mm/mo`
                  : 'Baseline'}
              </div>
            </div>
          </div>

          {/* Comparison with Baseline / Prior Observation */}
          {baselineVersion && selectedVersion && baselineVersion.id !== selectedVersion.id && (
            <div className="p-2.5 rounded-xl bg-surface-secondary border border-theme text-[11px] space-y-1">
              <div className="flex items-center justify-between text-text font-semibold">
                <span>vs Baseline (v1):</span>
                <span className="font-mono tabular-nums text-[#BD473B] dark:text-[#E0AEB2]">
                  {selectedVersion.lesion_length_mm - baselineVersion.lesion_length_mm >= 0 ? '+' : ''}
                  {(selectedVersion.lesion_length_mm - baselineVersion.lesion_length_mm).toFixed(1)} mm
                </span>
              </div>
              {baselineVersion.lesion_volume_mm3 && selectedVersion.lesion_volume_mm3 && (
                <div className="flex items-center justify-between text-text-muted">
                  <span>Volume Δ:</span>
                  <span className="font-mono tabular-nums">
                    {selectedVersion.lesion_volume_mm3 - baselineVersion.lesion_volume_mm3 >= 0 ? '+' : ''}
                    {(selectedVersion.lesion_volume_mm3 - baselineVersion.lesion_volume_mm3).toFixed(1)} mm³
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 text-[10px] text-text-muted border-t border-theme flex items-center justify-between">
            <span>Obs Date: {selectedVersion ? new Date(selectedVersion.state_timestamp).toLocaleDateString() : '—'}</span>
            <Link to="/observations" className="font-semibold text-[#563843] dark:text-[#8FDBF6] hover:underline">
              Compare Full History →
            </Link>
          </div>
        </div>

        {/* Historical Timeline Selector Bar (Bottom) */}
        <div className="border-t border-theme bg-surface p-3 sm:p-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text">
            <Calendar className="w-4 h-4 text-[#563843] dark:text-[#8FDBF6]" />
            <span>Serial Observation Timeline:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {versions.map((ver, idx) => {
              const isSelected = selectedVersion?.id === ver.id;
              const isLatest = idx === versions.length - 1;
              const dateStr = new Date(ver.state_timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] border-[#8FDBF6] dark:border-[#2D4C5E] font-bold shadow-xs'
                      : 'bg-surface-secondary border-theme text-text-secondary hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isLatest ? 'bg-emerald-500 animate-pulse' : 'bg-[#BD473B]'}`} />
                  <span>State v{ver.version_number}</span>
                  <span className="text-[10px] font-mono opacity-75">({dateStr})</span>
                  <span className="text-[10px] font-bold tabular-nums">
                    {ver.lesion_length_mm.toFixed(1)}mm
                  </span>
                  {isLatest && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                      Latest
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-text-muted hidden lg:block font-mono">
            Version {selectedVersion?.version_number || 1} of {versions.length}
          </div>
        </div>
      </div>
    </div>
  );
};
