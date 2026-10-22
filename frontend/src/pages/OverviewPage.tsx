import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { TwinStateVersion, Observation } from '../api/types';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { HolographicViewport } from '../components/twin/HolographicViewport';
import { ScanningModal } from '../components/simulation/ScanningModal';
import { LongitudinalChart } from '../components/common/LongitudinalChart';
import {
  Activity,
  Box,
  Play,
  Calendar,
  ArrowRight,
  ShieldAlert,
  ListOrdered,
  Columns,
  Eye,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { selectedPatient, reloadPatients, dataVersion } = usePatient();
  const navigate = useNavigate();

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

  const latestObs = observations.length > 0 ? observations[observations.length - 1] : null;
  const availableComparisonsCount =
    observations.length >= 2 ? observations.length - 1 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Banner: Patient Identity, Status & Primary Actions with Pale Mint Gradient */}
      <div className="bg-mint-header border border-[#DDE7E5] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F5F1] text-[#2F8F83] border border-[#C6E4DC]">
              Demonstration Subject
            </span>
            <span className="text-xs text-text-muted font-mono">{selectedPatient?.mrn}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#21685F] bg-[#E8F5F1] border border-[#21685F]/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F8F83] animate-pulse" />
              Device Status: Ready for Simulation
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#20332F]">
            {selectedPatient?.full_name}
          </h1>

          <p className="text-xs text-[#71817D]">
            DOB: {selectedPatient?.date_of_birth} • Sex: {selectedPatient?.biological_sex} • Surveillance: Endometrial Polyp Twin Track
          </p>
        </div>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#21685F] text-white hover:bg-[#1B544D] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none"
          >
            <Play className="w-4 h-4 fill-current text-[#E8F5F1]" />
            <span>Begin Assessment</span>
          </button>
          <Link
            to="/twin"
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-[#DDE7E5] bg-white hover:bg-[#F5F9F8] text-[#20332F] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none"
          >
            <Box className="w-4 h-4 text-[#2F8F83]" />
            <span>Inspect 3D Digital Twin</span>
          </Link>
        </div>
      </div>

      {/* 2. Operational Summary Metrics Bar (Real Data Driven) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Persisted Observations */}
        <div className="p-4 rounded-3xl bg-white border border-[#DDE7E5] shadow-xs space-y-1 hover:border-[#C6E4DC] transition-colors">
          <div className="flex items-center justify-between text-[#71817D] text-[11px] font-semibold uppercase tracking-wider">
            <span>Persisted Observations</span>
            <ListOrdered className="w-3.5 h-3.5 text-[#2F8F83]" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#20332F]">
            {observations.length}
          </div>
          <p className="text-[10px] text-[#71817D]">Chronological scan records</p>
        </div>

        {/* Metric 2: Latest Assessment Date */}
        <div className="p-4 rounded-3xl bg-white border border-[#DDE7E5] shadow-xs space-y-1 hover:border-[#C6E4DC] transition-colors">
          <div className="flex items-center justify-between text-[#71817D] text-[11px] font-semibold uppercase tracking-wider">
            <span>Latest Assessment</span>
            <Calendar className="w-3.5 h-3.5 text-[#2F8F83]" />
          </div>
          <div className="text-base font-bold font-mono text-[#20332F]">
            {latestObs ? new Date(latestObs.observed_at).toLocaleDateString() : 'None Recorded'}
          </div>
          <p className="text-[10px] text-[#71817D]">
            {latestObs ? `State v${twinState?.version_number || 1} synchronized` : 'Awaiting baseline scan'}
          </p>
        </div>

        {/* Metric 3: Historical Comparisons Available */}
        <div className="p-4 rounded-3xl bg-white border border-[#DDE7E5] shadow-xs space-y-1 hover:border-[#C6E4DC] transition-colors">
          <div className="flex items-center justify-between text-[#71817D] text-[11px] font-semibold uppercase tracking-wider">
            <span>Serial Comparisons</span>
            <Columns className="w-3.5 h-3.5 text-[#2F8F83]" />
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-[#20332F]">
            {availableComparisonsCount}
          </div>
          <p className="text-[10px] text-[#71817D]">
            {availableComparisonsCount > 0 ? 'Pairwise deltas available' : 'Requires ≥ 2 scans'}
          </p>
        </div>

        {/* Metric 4: Latest Caliper Measurement */}
        <div className="p-4 rounded-3xl bg-white border border-[#DDE7E5] shadow-xs space-y-1 hover:border-[#C6E4DC] transition-colors">
          <div className="flex items-center justify-between text-[#71817D] text-[11px] font-semibold uppercase tracking-wider">
            <span>Latest Dimension</span>
            <Activity className="w-3.5 h-3.5 text-[#2F8F83]" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-[#20332F]">
            {twinState ? `${twinState.lesion_length_mm.toFixed(1)} × ${twinState.lesion_width_mm.toFixed(1)} mm` : '—'}
          </div>
          <p className="text-[10px] text-[#71817D]">
            {twinState?.lesion_volume_mm3 ? `Vol: ${twinState.lesion_volume_mm3.toFixed(1)} mm³ (derived)` : 'Illustrative'}
          </p>
        </div>
      </div>

      {/* 3. Central Stage: 3D Digital Twin Viewport & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Twin Mini Preview Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#DDE7E5] rounded-3xl overflow-hidden shadow-xs flex flex-col h-[440px] relative">
          <div className="p-3.5 px-4 border-b border-[#DDE7E5] flex items-center justify-between bg-[#F0F8F5]/80 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#2F8F83]" />
              <h2 className="text-xs font-bold text-[#20332F]">3D Digital Twin — Coronal Cutaway</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#DDE7E5] text-[#71817D]">
                v{twinState?.version_number || 1}
              </span>
            </div>
            <Link
              to="/twin"
              className="text-xs font-semibold text-[#2F8F83] hover:text-[#21685F] flex items-center gap-1 transition-colors"
            >
              <span>Full Workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Three.js Viewport loading uterus.glb */}
          <div className="flex-1 relative">
            <HolographicViewport
              lesionLengthMm={twinState?.lesion_length_mm || 10.8}
              lesionWidthMm={twinState?.lesion_width_mm || 7.4}
              lesionDepthMm={twinState?.lesion_depth_mm || 6.8}
              placementX={twinState?.placement_x || 0.12}
              placementY={twinState?.placement_y || 0.22}
              placementZ={twinState?.placement_z || 0.00}
              showAnnotation={false}
              autoRotate={true}
              showHudControls={false}
              initialViewMode="cutaway"
              className="w-full h-full"
            />

            {/* Bottom Overlay Pill */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] text-[#20332F]">
              <span className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#DDE7E5] shadow-xs font-medium">
                Drag to rotate • Scroll to zoom
              </span>
              <span className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#DDE7E5] shadow-xs font-mono text-[#71817D]">
                uterus.glb • Synthetic Lesion
              </span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Calipers Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Card: Current Calipers */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#71817D] border-b border-[#DDE7E5] pb-2">
              <span className="font-semibold text-[#20332F]">Lesion State Telemetry</span>
              <ProvenanceBadge type="DERIVED" size="xs" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-[#71817D] block">Longest Caliper (L)</span>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-[#20332F]">
                  {twinState ? twinState.lesion_length_mm.toFixed(1) : '—'}{' '}
                  <span className="text-xs font-normal text-[#71817D]">mm</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#71817D] block">Width Caliper (W)</span>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-[#20332F]">
                  {twinState ? twinState.lesion_width_mm.toFixed(1) : '—'}{' '}
                  <span className="text-xs font-normal text-[#71817D]">mm</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DDE7E5] flex items-center justify-between text-xs">
              <span className="text-[#71817D]">Derived Volume (Ellipsoid):</span>
              <span className="font-mono font-bold tabular-nums text-[#B77B36]">
                {twinState?.lesion_volume_mm3 ? `${twinState.lesion_volume_mm3.toFixed(1)} mm³` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71817D]">Interval Growth Rate:</span>
              <span className="font-mono font-bold tabular-nums text-[#20332F]">
                {twinState?.growth_rate_mm_per_month !== null && twinState?.growth_rate_mm_per_month !== undefined
                  ? `${twinState.growth_rate_mm_per_month >= 0 ? '+' : ''}${twinState.growth_rate_mm_per_month.toFixed(2)} mm/mo`
                  : 'Baseline (v1)'}
              </span>
            </div>
          </div>

          {/* Longitudinal Trend Chart (Compact) */}
          <LongitudinalChart observations={observations} compact={true} />
        </div>
      </div>

      {/* 4. Recent Observations Records Table */}
      <div className="bg-white border border-[#DDE7E5] rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#2F8F83]" />
            <h3 className="text-xs font-bold text-[#20332F] uppercase tracking-wider">
              Recent Persisted Observations
            </h3>
          </div>
          <Link
            to="/observations"
            className="text-xs font-semibold text-[#2F8F83] hover:text-[#21685F] flex items-center gap-1 transition-colors"
          >
            <span>View All ({observations.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {observations.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71817D]">
            No observations on file for this patient. Click "Begin Assessment" above to run a simulated acquisition.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F8F5]/80 border-b border-[#DDE7E5] text-[#71817D] text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Provenance</th>
                  <th className="py-2.5 px-3">Length (L)</th>
                  <th className="py-2.5 px-3">Width (W)</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE7E5]">
                {observations.slice(-4).reverse().map((obs) => (
                  <tr key={obs.id} className="hover:bg-[#F0F8F5]/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-[#20332F]">
                      {new Date(obs.observed_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <ProvenanceBadge type={obs.source} size="xs" />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#20332F] tabular-nums">
                      {obs.length_mm.toFixed(1)} mm
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#20332F] tabular-nums">
                      {obs.width_mm.toFixed(1)} mm
                    </td>
                    <td className="py-3 px-3 font-mono text-[#B77B36] font-bold tabular-nums">
                      {obs.measurements?.volume_mm3 ? `${obs.measurements.volume_mm3.toFixed(1)} mm³` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#71817D] tabular-nums">
                      {(obs.measurement_confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/twin"
                        className="px-2 py-1 rounded-lg border border-[#DDE7E5] bg-white hover:bg-[#F0F8F5] text-[10px] font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-[#2F8F83]" />
                        <span>3D</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Non-Claim Regulatory Notice */}
      <div className="bg-white border border-[#DDE7E5] rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 text-xs text-[#71817D]">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#B77B36] shrink-0" />
          <span>
            <strong className="text-[#20332F]">Academic Research Proof-of-Concept:</strong> POLYPULSE demonstration assessments and illustrative geometry are not clinical findings and must not be used for diagnosis or treatment decisions.
          </span>
        </div>
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
