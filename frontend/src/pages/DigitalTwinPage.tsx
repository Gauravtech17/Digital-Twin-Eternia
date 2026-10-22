import React, { useEffect, useState } from 'react';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { TwinStateVersion, Observation } from '../api/types';
import { HolographicViewport } from '../components/twin/HolographicViewport';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  Calendar,
  Info,
  ArrowRight,
  Box,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DigitalTwinPage: React.FC = () => {
  const { selectedPatient, dataVersion } = usePatient();

  const [versions, setVersions] = useState<TwinStateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<TwinStateVersion | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [, setLoading] = useState<boolean>(true);

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
      {/* 1. Page Header with Pale Mint Gradient */}
      <div className="bg-mint-header border border-[#DDE7E5] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#20332F]">
              Digital Twin Workstation
            </h1>
            <span className="text-[10px] font-mono uppercase bg-[#E8F5F1] text-[#2F8F83] px-2 py-0.5 rounded border border-[#C6E4DC] font-bold">
              3D Observation-Linked
            </span>
          </div>
          <p className="text-xs text-[#71817D] mt-0.5">
            Synchronized with TwinStateVersion v{selectedVersion?.version_number || 1} • {selectedPatient?.full_name} ({selectedPatient?.mrn})
          </p>
        </div>

        {/* Transparent Asset Notice */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#DDE7E5] bg-white text-[#71817D] text-[11px] shadow-xs">
          <Info className="w-3.5 h-3.5 text-[#2F8F83] shrink-0" />
          <span>
            Authoritative uterus.glb asset • Illustrative lesion geometry (synthetic demonstration)
          </span>
        </div>
      </div>

      {/* 2. Main 3D Digital Twin Viewer Card */}
      <div className="bg-white border border-[#DDE7E5] rounded-3xl overflow-hidden shadow-xs relative flex flex-col h-[650px]">
        {/* Holographic 3D Viewport with Authoritative uterus.glb */}
        <div className="flex-1 w-full h-full relative">
          <HolographicViewport
            key={selectedVersion?.id || 'default'}
            lesionLengthMm={selectedVersion?.lesion_length_mm || 10.8}
            lesionWidthMm={selectedVersion?.lesion_width_mm || 7.4}
            lesionDepthMm={selectedVersion?.lesion_depth_mm || 6.8}
            placementX={selectedVersion?.placement_x || 0.12}
            placementY={selectedVersion?.placement_y || 0.22}
            placementZ={selectedVersion?.placement_z || 0.00}
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
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#21685F] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#C6E4DC] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#2F8F83] animate-ping" />
                LATEST OBSERVATION (v{selectedVersion?.version_number})
              </span>
            </div>
          )}
        </div>

        {/* Floating Telemetry & Longitudinal Comparison Box (Bottom Right) */}
        <div className="absolute bottom-20 sm:bottom-24 right-4 z-10 max-w-sm w-full bg-white/95 backdrop-blur-md border border-[#DDE7E5] rounded-2xl p-4 shadow-lg text-xs space-y-3 pointer-events-auto select-none">
          <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-2">
            <div>
              <span className="font-bold text-[#20332F]">Selected State Telemetry</span>
              <span className="text-[10px] text-[#71817D] ml-1.5 font-mono">
                State v{selectedVersion?.version_number}
              </span>
            </div>
            <ProvenanceBadge type={generatingObs?.source || 'DERIVED'} size="xs" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#71817D]">Longest Caliper (L):</span>
              <div className="font-mono font-bold text-[#20332F] text-sm tabular-nums">
                {selectedVersion ? `${selectedVersion.lesion_length_mm.toFixed(1)} mm` : '—'}
              </div>
            </div>
            <div>
              <span className="text-[#71817D]">Width Caliper (W):</span>
              <div className="font-mono font-bold text-[#20332F] text-sm tabular-nums">
                {selectedVersion ? `${selectedVersion.lesion_width_mm.toFixed(1)} mm` : '—'}
              </div>
            </div>
            <div>
              <span className="text-[#71817D]">Derived Volume (V):</span>
              <div className="font-mono font-bold text-[#B77B36] text-sm tabular-nums">
                {selectedVersion?.lesion_volume_mm3
                  ? `${selectedVersion.lesion_volume_mm3.toFixed(1)} mm³`
                  : 'Omitted'}
              </div>
            </div>
            <div>
              <span className="text-[#71817D]">Interval Growth Rate:</span>
              <div className="font-mono font-bold text-[#20332F] text-sm tabular-nums">
                {selectedVersion?.growth_rate_mm_per_month !== null && selectedVersion?.growth_rate_mm_per_month !== undefined
                  ? `${selectedVersion.growth_rate_mm_per_month >= 0 ? '+' : ''}${selectedVersion.growth_rate_mm_per_month.toFixed(2)} mm/mo`
                  : 'Baseline'}
              </div>
            </div>
          </div>

          {/* Comparison with Baseline / Prior Observation */}
          {baselineVersion && selectedVersion && baselineVersion.id !== selectedVersion.id && (
            <div className="p-2.5 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5] text-[11px] space-y-1">
              <div className="flex items-center justify-between text-[#20332F] font-semibold">
                <span>Δ vs Baseline (v1):</span>
                <span className="font-mono tabular-nums text-[#B77B36]">
                  {selectedVersion.lesion_length_mm - baselineVersion.lesion_length_mm >= 0 ? '+' : ''}
                  {(selectedVersion.lesion_length_mm - baselineVersion.lesion_length_mm).toFixed(1)} mm
                </span>
              </div>
              {baselineVersion.lesion_volume_mm3 && selectedVersion.lesion_volume_mm3 && (
                <div className="flex items-center justify-between text-[#71817D]">
                  <span>Volume Δ:</span>
                  <span className="font-mono tabular-nums">
                    {selectedVersion.lesion_volume_mm3 - baselineVersion.lesion_volume_mm3 >= 0 ? '+' : ''}
                    {(selectedVersion.lesion_volume_mm3 - baselineVersion.lesion_volume_mm3).toFixed(1)} mm³
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 text-[10px] text-[#71817D] border-t border-[#DDE7E5] flex items-center justify-between">
            <span>
              Obs Date: {selectedVersion ? new Date(selectedVersion.state_timestamp).toLocaleDateString() : '—'}
            </span>
            <Link
              to="/observations"
              className="font-semibold text-[#2F8F83] hover:text-[#21685F] flex items-center gap-1 transition-colors"
            >
              <span>Compare Full History</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 3. Historical Timeline Scrubber Bar (Bottom) */}
        <div className="border-t border-[#DDE7E5] bg-white p-3 sm:p-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#20332F]">
            <Calendar className="w-4 h-4 text-[#2F8F83]" />
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none ${
                    isSelected
                      ? 'bg-[#E8F5F1] text-[#2F8F83] border-[#C6E4DC] font-bold shadow-xs'
                      : 'bg-[#F5F9F8] border-[#DDE7E5] text-[#71817D] hover:text-[#20332F] hover:bg-[#EDF4F2]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLatest ? 'bg-[#21685F] animate-pulse' : 'bg-[#B77B36]'
                    }`}
                  />
                  <span>State v{ver.version_number}</span>
                  <span className="text-[10px] font-mono opacity-75">({dateStr})</span>
                  <span className="text-[10px] font-bold tabular-nums">
                    {ver.lesion_length_mm.toFixed(1)}mm
                  </span>
                  {isLatest && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#E8F5F1] text-[#21685F] font-bold border border-[#C6E4DC]">
                      Latest
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-[#71817D] hidden lg:block font-mono">
            State {selectedVersion?.version_number || 1} of {versions.length}
          </div>
        </div>
      </div>
    </div>
  );
};
