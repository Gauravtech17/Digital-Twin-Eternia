import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { Observation, ObservationSource } from '../api/types';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  ListOrdered,
  Plus,
  Columns,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  X,
  Box,
  Radio,
  Clock,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const ObservationsPage: React.FC = () => {
  const { selectedPatient, dataVersion, notifyDataChanged } = usePatient();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Add Observation Form Modal
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [obsDate, setObsDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [obsSource, setObsSource] = useState<ObservationSource>('SIMULATED_STREAM');
  const [lengthMm, setLengthMm] = useState<string>('10.2');
  const [widthMm, setWidthMm] = useState<string>('7.1');
  const [depthMm, setDepthMm] = useState<string>('6.8');
  const [confidence, setConfidence] = useState<number>(0.94);
  const [quality, setQuality] = useState<number>(0.91);
  const [notes, setNotes] = useState<string>('');

  // Comparison State
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [compareObs1Id, setCompareObs1Id] = useState<number | null>(null);
  const [compareObs2Id, setCompareObs2Id] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  const loadObservations = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await api.getObservations(
        selectedPatient.id,
        sourceFilter === 'ALL' ? undefined : sourceFilter
      );
      setObservations(data);
      if (data.length >= 2) {
        setCompareObs1Id(data[0].id);
        setCompareObs2Id(data[data.length - 1].id);
      }
    } catch (e) {
      console.error('Failed to load observations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, [selectedPatient?.id, sourceFilter, dataVersion]);

  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const l = parseFloat(lengthMm);
    const w = parseFloat(widthMm);
    const d = depthMm.trim() ? parseFloat(depthMm) : null;

    if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0) {
      setFormError('Length and width must be valid positive numbers in millimeters.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await api.createObservation({
        patient_id: selectedPatient.id,
        observed_at: new Date(obsDate).toISOString(),
        source: obsSource,
        length_mm: l,
        width_mm: w,
        depth_mm: d,
        missing_depth_assumption: !d ? 'ASSUME_DEPTH_EQUALS_WIDTH' : undefined,
        measurement_confidence: confidence,
        image_quality: quality,
        notes: notes.trim() || undefined,
        provenance_tag: obsSource === 'MANUAL' ? 'MANUAL' : 'SIMULATED',
      });

      setAddModalOpen(false);
      await loadObservations();
      notifyDataChanged();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit observation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunComparison = async () => {
    if (!compareObs1Id || !compareObs2Id) return;
    try {
      setComparing(true);
      const res = await api.compareObservations(compareObs1Id, compareObs2Id);
      setComparisonResult(res);
      setCompareModalOpen(true);
    } catch (e) {
      console.error('Failed to compare observations:', e);
    } finally {
      setComparing(false);
    }
  };

  // Derive Summary Metrics
  const totalCount = observations.length;
  const baselineObs = totalCount > 0 ? observations[0] : null;
  const latestObs = totalCount > 0 ? observations[totalCount - 1] : null;
  const hasMultiple = totalCount >= 2;

  const deltaL =
    hasMultiple && latestObs && baselineObs
      ? latestObs.length_mm - baselineObs.length_mm
      : 0;

  const deltaV =
    hasMultiple &&
    latestObs?.measurements?.volume_mm3 &&
    baselineObs?.measurements?.volume_mm3
      ? latestObs.measurements.volume_mm3 - baselineObs.measurements.volume_mm3
      : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Page Header with BioTrack Aesthetic */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Recorded Observations Log
            </h1>
            <span className="text-[10px] font-mono uppercase bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] px-2 py-0.5 rounded border border-[#BCE9F9] dark:border-[#2D4C5E] font-bold">
              Longitudinal Track
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Chronological inspection, caliper dimensions, and differential comparison for{' '}
            <span className="font-semibold text-text">{selectedPatient?.full_name}</span> ({selectedPatient?.mrn})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {observations.length >= 2 && (
            <button
              onClick={handleRunComparison}
              disabled={comparing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-theme bg-surface hover:bg-surface-secondary text-text text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5 text-[#563843] dark:text-[#8FDBF6]" />
              <span>Compare Observations</span>
            </button>
          )}

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#040304] text-white hover:bg-neutral-800 dark:bg-[#8FDBF6] dark:text-[#040304] dark:hover:bg-[#BCE9F9] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Observation</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive Longitudinal Metric Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Points */}
        <div className="p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Observations</span>
            <ListOrdered className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="text-2xl font-black text-text font-mono tabular-nums">
            {totalCount}
          </div>
          <p className="text-[10px] text-text-secondary">Chronological data points</p>
        </div>

        {/* Baseline Calipers */}
        <div className="p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Baseline Dimension</span>
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="text-lg font-black text-text font-mono tabular-nums">
            {baselineObs ? `${baselineObs.length_mm.toFixed(1)} × ${baselineObs.width_mm.toFixed(1)}` : '—'}
            <span className="text-[10px] text-text-muted font-normal ml-1">mm</span>
          </div>
          <p className="text-[10px] text-text-secondary">
            {baselineObs ? new Date(baselineObs.observed_at).toLocaleDateString() : 'No baseline'}
          </p>
        </div>

        {/* Latest Calipers */}
        <div className="p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Latest Dimension</span>
            <Sparkles className="w-3.5 h-3.5 text-[#563843] dark:text-[#8FDBF6]" />
          </div>
          <div className="text-lg font-black text-text font-mono tabular-nums">
            {latestObs ? `${latestObs.length_mm.toFixed(1)} × ${latestObs.width_mm.toFixed(1)}` : '—'}
            <span className="text-[10px] text-text-muted font-normal ml-1">mm</span>
          </div>
          <p className="text-[10px] text-text-secondary">
            {latestObs ? new Date(latestObs.observed_at).toLocaleDateString() : 'No data'}
          </p>
        </div>

        {/* Net Differential */}
        <div className="p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net Δ vs Baseline</span>
            <Activity className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-black font-mono tabular-nums ${deltaL > 0 ? 'text-[#BD473B]' : 'text-text'}`}>
              {hasMultiple ? `${deltaL >= 0 ? '+' : ''}${deltaL.toFixed(1)} mm` : '—'}
            </span>
            {hasMultiple && (
              deltaL > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-[#BD473B]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              )
            )}
          </div>
          <p className="text-[10px] text-text-secondary font-mono">
            {hasMultiple ? `ΔV: ${deltaV >= 0 ? '+' : ''}${deltaV.toFixed(1)} mm³` : 'Requires ≥ 2 scans'}
          </p>
        </div>
      </div>

      {/* 3. Filter and Summary Bar */}
      <div className="bg-surface border border-theme rounded-3xl p-4 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-semibold text-text">Source Filter:</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'ALL', label: 'All Sources' },
              { id: 'SIMULATED_STREAM', label: 'Simulated Streams' },
              { id: 'MANUAL', label: 'Manual Scans' },
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setSourceFilter(src.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  sourceFilter === src.id
                    ? 'bg-[#040304] text-white dark:bg-[#8FDBF6] dark:text-[#040304] font-bold shadow-xs'
                    : 'text-text-secondary hover:text-text hover:bg-surface-secondary'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-text-muted font-mono">
          Showing {observations.length} observation{observations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 4. Chronological Observations Table */}
      <div className="bg-surface border border-theme rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-secondary/70 border-b border-theme text-text-muted text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Observation Date</th>
                <th className="py-3.5 px-4">Source & Provenance</th>
                <th className="py-3.5 px-4">Longest (L)</th>
                <th className="py-3.5 px-4">Width (W)</th>
                <th className="py-3.5 px-4">Depth (D)</th>
                <th className="py-3.5 px-4">Derived Volume</th>
                <th className="py-3.5 px-4">Quality & Confidence</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {observations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-secondary text-xs">
                    No observations recorded yet. Start an assessment in the Simulation Console or Overview.
                  </td>
                </tr>
              ) : (
                observations.map((obs, idx) => {
                  const isLatest = idx === observations.length - 1;
                  const dateStr = new Date(obs.observed_at).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={obs.id}
                      className={`hover:bg-surface-secondary/60 transition-colors ${
                        isLatest ? 'bg-[#8FDBF6]/8 dark:bg-[#8FDBF6]/10 font-medium' : ''
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="font-semibold text-text flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-text-muted" />
                          <span className="font-mono tabular-nums text-xs">{dateStr}</span>
                          {isLatest && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-[#8FDBF6]/30 dark:bg-[#8FDBF6]/20 text-[#0284C7] dark:text-[#8FDBF6] font-extrabold border border-[#8FDBF6]/40">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <ProvenanceBadge type={obs.source} size="xs" />
                          <span className="text-[10px] text-text-muted font-mono uppercase">
                            {obs.source.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-text tabular-nums">
                        {obs.length_mm.toFixed(1)} <span className="text-[10px] text-text-muted font-normal">mm</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-text tabular-nums">
                        {obs.width_mm.toFixed(1)} <span className="text-[10px] text-text-muted font-normal">mm</span>
                      </td>

                      <td className="py-4 px-4 font-mono text-text tabular-nums">
                        {obs.depth_mm ? (
                          <>
                            <span className="font-bold">{obs.depth_mm.toFixed(1)}</span>{' '}
                            <span className="text-[10px] text-text-muted">mm</span>
                          </>
                        ) : (
                          <span className="text-text-muted text-[10px] italic">Assumed = W</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono font-extrabold text-[#563843] dark:text-[#8FDBF6] tabular-nums">
                        {obs.measurements?.volume_mm3 ? (
                          <>
                            {obs.measurements.volume_mm3.toFixed(1)}{' '}
                            <span className="text-[10px] text-text-muted font-normal">mm³</span>
                          </>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-[11px] font-mono text-text tabular-nums">
                          Conf: {(obs.measurement_confidence * 100).toFixed(0)}% • Qual: {(obs.image_quality * 100).toFixed(0)}%
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link
                          to="/twin"
                          className="px-2.5 py-1.5 rounded-xl border border-theme bg-surface hover:bg-surface-secondary text-[11px] font-semibold text-text inline-flex items-center gap-1.5 transition-all shadow-2xs hover:scale-102"
                        >
                          <Box className="w-3 h-3 text-[#563843] dark:text-[#8FDBF6]" />
                          <span>View in 3D</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Differential Longitudinal Comparison Modal */}
      {compareModalOpen && comparisonResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface border border-theme rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-theme flex items-center justify-between bg-surface-secondary/70">
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-[#563843] dark:text-[#8FDBF6]" />
                <h3 className="font-bold text-text text-sm">Longitudinal Differential Comparison</h3>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1 rounded-xl text-text-secondary hover:text-text hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Selector Controls for Observations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Baseline / Earlier Observation:
                  </label>
                  <select
                    value={compareObs1Id || ''}
                    onChange={(e) => setCompareObs1Id(Number(e.target.value))}
                    className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
                  >
                    {observations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.observed_at).toLocaleDateString()} — {o.length_mm.toFixed(1)}mm ({o.source})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Subsequent / Later Observation:
                  </label>
                  <select
                    value={compareObs2Id || ''}
                    onChange={(e) => setCompareObs2Id(Number(e.target.value))}
                    className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
                  >
                    {observations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.observed_at).toLocaleDateString()} — {o.length_mm.toFixed(1)}mm ({o.source})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earlier Card */}
                <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-theme space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-theme pb-2">
                    <span className="font-bold text-text">Observation A (Baseline / Earlier)</span>
                    <span className="font-mono text-[10px] text-text-muted tabular-nums">
                      {new Date(comparisonResult.earlier_observation.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Length (L):</span>
                    <span className="font-mono font-bold text-text tabular-nums">{comparisonResult.earlier_observation.length_mm.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Width (W):</span>
                    <span className="font-mono font-bold text-text tabular-nums">{comparisonResult.earlier_observation.width_mm.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Depth (D):</span>
                    <span className="font-mono font-bold text-text tabular-nums">
                      {comparisonResult.earlier_observation.depth_mm ? `${comparisonResult.earlier_observation.depth_mm.toFixed(1)} mm` : 'Assumed = W'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-theme/50">
                    <span className="text-text-muted">Volume:</span>
                    <span className="font-mono font-extrabold text-[#563843] dark:text-[#8FDBF6] tabular-nums">
                      {comparisonResult.earlier_observation.volume_mm3 ? `${comparisonResult.earlier_observation.volume_mm3.toFixed(1)} mm³` : '—'}
                    </span>
                  </div>
                </div>

                {/* Later Card */}
                <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-theme space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-theme pb-2">
                    <span className="font-bold text-text">Observation B (Subsequent / Later)</span>
                    <span className="font-mono text-[10px] text-text-muted tabular-nums">
                      {new Date(comparisonResult.later_observation.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Length (L):</span>
                    <span className="font-mono font-bold text-text tabular-nums">{comparisonResult.later_observation.length_mm.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Width (W):</span>
                    <span className="font-mono font-bold text-text tabular-nums">{comparisonResult.later_observation.width_mm.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Depth (D):</span>
                    <span className="font-mono font-bold text-text tabular-nums">
                      {comparisonResult.later_observation.depth_mm ? `${comparisonResult.later_observation.depth_mm.toFixed(1)} mm` : 'Assumed = W'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-theme/50">
                    <span className="text-text-muted">Volume:</span>
                    <span className="font-mono font-extrabold text-[#563843] dark:text-[#8FDBF6] tabular-nums">
                      {comparisonResult.later_observation.volume_mm3 ? `${comparisonResult.later_observation.volume_mm3.toFixed(1)} mm³` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculated Differential Summary Panel */}
              <div className="p-4 rounded-2xl bg-surface-secondary border border-theme text-xs space-y-3">
                <div className="font-bold text-text flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#563843] dark:text-[#8FDBF6]" />
                    <span>Differential Telemetry (Derived)</span>
                  </span>
                  <span className="font-mono text-[10px] text-text-muted tabular-nums">
                    Elapsed: {comparisonResult.comparison.elapsed_days} days
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="bg-surface p-3 rounded-xl border border-theme">
                    <span className="text-[10px] text-text-muted block font-sans">Δ Length:</span>
                    <span className={`font-black text-sm tabular-nums ${comparisonResult.comparison.delta_length_mm > 0 ? 'text-[#BD473B]' : 'text-text'}`}>
                      {comparisonResult.comparison.delta_length_mm >= 0 ? '+' : ''}
                      {comparisonResult.comparison.delta_length_mm.toFixed(2)} mm
                    </span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-theme">
                    <span className="text-[10px] text-text-muted block font-sans">Δ Volume:</span>
                    <span className="font-black text-sm text-[#563843] dark:text-[#8FDBF6] tabular-nums">
                      {comparisonResult.comparison.delta_volume_mm3 !== null
                        ? `${comparisonResult.comparison.delta_volume_mm3 >= 0 ? '+' : ''}${comparisonResult.comparison.delta_volume_mm3.toFixed(1)} mm³`
                        : '—'}
                    </span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-theme">
                    <span className="text-[10px] text-text-muted block font-sans">Annualized Growth:</span>
                    <span className={`font-black text-sm tabular-nums ${comparisonResult.comparison.growth_rate_mm_per_month > 0 ? 'text-[#BD473B]' : 'text-text'}`}>
                      {comparisonResult.comparison.growth_rate_mm_per_month !== null
                        ? `${comparisonResult.comparison.growth_rate_mm_per_month >= 0 ? '+' : ''}${comparisonResult.comparison.growth_rate_mm_per_month.toFixed(2)} mm/mo`
                        : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-text-muted pt-1">
                  Formula: {comparisonResult.comparison.formula_used}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme flex justify-end bg-surface-secondary/70">
              <button
                onClick={() => setCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#040304] text-white hover:bg-neutral-800 dark:bg-[#8FDBF6] dark:text-[#040304] dark:hover:bg-[#BCE9F9] text-xs font-bold transition-all cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Manual Clinical Observation Entry Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateObservation}
            className="bg-surface border border-theme rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-4 border-b border-theme flex items-center justify-between bg-surface-secondary/70">
              <h3 className="font-bold text-text text-sm">Add Serial Clinical Observation</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-xl text-text-secondary hover:text-text hover:bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#BD473B] font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={obsDate}
                    onChange={(e) => setObsDate(e.target.value)}
                    className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Source</label>
                  <select
                    value={obsSource}
                    onChange={(e) => setObsSource(e.target.value as ObservationSource)}
                    className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
                  >
                    <option value="SIMULATED_STREAM">Simulated Stream</option>
                    <option value="MANUAL">Manual Clinical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Length (L mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={lengthMm}
                    onChange={(e) => setLengthMm(e.target.value)}
                    className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Width (W mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={widthMm}
                    onChange={(e) => setWidthMm(e.target.value)}
                    className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Depth (D mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={depthMm}
                    onChange={(e) => setDepthMm(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Clinical Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional observation notes..."
                  className="w-full border border-theme rounded-xl p-2.5 bg-surface text-text"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme flex justify-end gap-2 bg-surface-secondary/70">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-theme text-text-secondary hover:text-text hover:bg-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#040304] text-white hover:bg-neutral-800 dark:bg-[#8FDBF6] dark:text-[#040304] dark:hover:bg-[#BCE9F9] text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Commit Observation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
