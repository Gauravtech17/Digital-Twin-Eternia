import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { ScanningModal } from '../components/simulation/ScanningModal';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { SimulationIngestResponse } from '../api/types';
import {
  Cpu,
  Radio,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  Box,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';

export const SimulationConsolePage: React.FC = () => {
  const { selectedPatient, patients, setSelectedPatientId, reloadPatients } = usePatient();
  const navigate = useNavigate();

  // Scan Duration Selection (Default 10s demo mode, with 60s standard and 5s fast presets)
  const [durationSeconds, setDurationSeconds] = useState<number>(10);

  // Simulated Observation Parameters (Default values based on longitudinal growth progression)
  const [lengthMm, setLengthMm] = useState<string>('10.8');
  const [widthMm, setWidthMm] = useState<string>('7.4');
  const [depthMm, setDepthMm] = useState<string>('7.0');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [latestAssessment, setLatestAssessment] = useState<SimulationIngestResponse | null>(null);

  const handleStartAssessment = () => {
    if (!selectedPatient) return;
    setIsModalOpen(true);
  };

  const handleAssessmentCompleted = async (res: SimulationIngestResponse) => {
    setLatestAssessment(res);
    await reloadPatients();
  };

  const lNum = parseFloat(lengthMm) || 10.4;
  const wNum = parseFloat(widthMm) || 7.2;
  const dNum = parseFloat(depthMm) || 6.8;

  // Derived Volume Preview: (pi / 6) * L * W * D
  const previewVolume = ((Math.PI / 6) * lNum * wNum * dNum).toFixed(1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Simulation Console
            </h1>
            <span className="text-[10px] font-mono uppercase bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] px-2 py-0.5 rounded border border-[#BCE9F9] dark:border-[#2D4C5E] font-bold">
              Wearable Stand-in
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure simulated scan telemetry and execute real-time ultrasound acquisition workflow
          </p>
        </div>

        {/* Device Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs shadow-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>DEVICE STATUS: READY FOR SIMULATION</span>
        </div>
      </div>

      {/* Mandatory Non-Claim Medical Research Notice */}
      <div className="p-4 rounded-2xl bg-surface border border-theme text-xs shadow-xs flex items-start gap-3">
        <Radio className="w-5 h-5 text-[#563843] dark:text-[#8FDBF6] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text uppercase tracking-wider text-[11px]">
              Proposed Future Wearable Architecture
            </span>
            <ProvenanceBadge type="SIMULATED" size="xs" />
          </div>
          <p className="text-text-secondary leading-relaxed">
            Continuous uterine ultrasound wearables do not currently exist and are not clinically approved. This console functions as an explicit <strong>software simulation stand-in</strong> demonstrating how continuous telemetry streams into the POLYPULSE longitudinal math engine and updates the patient's versioned digital twin.
          </p>
        </div>
      </div>

      {/* Main Console Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Patient Target & Protocol Selection */}
          <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <div>
                <h2 className="text-sm font-bold text-text">1. Target Patient Cohort</h2>
                <p className="text-xs text-text-secondary">Select the fictional patient for this assessment session</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-secondary border border-theme text-text-muted">
                Step 1 of 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {patients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-subtle text-[#0284C7] dark:bg-[#192D38] dark:text-[#8FDBF6] border-[#8FDBF6] dark:border-[#2D4C5E] font-bold shadow-xs'
                        : 'bg-surface-secondary border-theme text-text hover:bg-surface-hover'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.full_name}</div>
                    <div className="text-[10px] text-text-muted font-mono mt-0.5">{p.mrn}</div>
                    <div className="mt-2 text-[10px] px-1.5 py-0.5 rounded bg-surface border border-theme inline-block text-text-secondary">
                      {p.observation_count} observations
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Configurable Scan Duration */}
          <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <div>
                <h2 className="text-sm font-bold text-text">2. Scan Duration Preset</h2>
                <p className="text-xs text-text-secondary">Configurable countdown duration for demonstration verification</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-secondary border border-theme text-text-muted">
                Step 2 of 3
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDurationSeconds(60)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  durationSeconds === 60
                    ? 'bg-blue-subtle border-[#8FDBF6] dark:bg-[#192D38] dark:border-[#2D4C5E] text-[#0284C7] dark:text-[#8FDBF6] font-bold shadow-xs'
                    : 'bg-surface-secondary border-theme text-text-secondary hover:text-text hover:bg-surface-hover'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1 text-[#563843] dark:text-[#8FDBF6]" />
                <div className="text-sm font-mono font-bold tabular-nums">60s</div>
                <div className="text-[10px] text-text-muted">Standard Protocol</div>
              </button>

              <button
                type="button"
                onClick={() => setDurationSeconds(10)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  durationSeconds === 10
                    ? 'bg-blue-subtle border-[#8FDBF6] dark:bg-[#192D38] dark:border-[#2D4C5E] text-[#0284C7] dark:text-[#8FDBF6] font-bold shadow-xs'
                    : 'bg-surface-secondary border-theme text-text-secondary hover:text-text hover:bg-surface-hover'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-[#BD473B]" />
                <div className="text-sm font-mono font-bold tabular-nums">10s</div>
                <div className="text-[10px] text-[#BD473B] dark:text-rose-400 font-semibold">Demo Recommended</div>
              </button>

              <button
                type="button"
                onClick={() => setDurationSeconds(5)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  durationSeconds === 5
                    ? 'bg-blue-subtle border-[#8FDBF6] dark:bg-[#192D38] dark:border-[#2D4C5E] text-[#0284C7] dark:text-[#8FDBF6] font-bold shadow-xs'
                    : 'bg-surface-secondary border-theme text-text-secondary hover:text-text hover:bg-surface-hover'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <div className="text-sm font-mono font-bold tabular-nums">5s</div>
                <div className="text-[10px] text-text-muted">Fast Evaluation</div>
              </button>
            </div>
          </div>

          {/* Card 3: Simulated Lesion Parameters */}
          <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <div>
                <h2 className="text-sm font-bold text-text">3. Simulated Lesion Calipers (Input Stream)</h2>
                <p className="text-xs text-text-secondary">
                  Target dimensions that the simulated scan will measure and submit to the twin
                </p>
              </div>
              <ProvenanceBadge type="SIMULATED" size="xs" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Length (L mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="35.0"
                  value={lengthMm}
                  onChange={(e) => setLengthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-theme rounded-xl p-2.5 bg-surface-secondary text-text focus:outline-none focus:ring-2 focus:ring-[#8FDBF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Width (W mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="30.0"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-theme rounded-xl p-2.5 bg-surface-secondary text-text focus:outline-none focus:ring-2 focus:ring-[#8FDBF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Depth (D mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="30.0"
                  value={depthMm}
                  onChange={(e) => setDepthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-theme rounded-xl p-2.5 bg-surface-secondary text-text focus:outline-none focus:ring-2 focus:ring-[#8FDBF6]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-secondary border border-theme flex items-center justify-between text-xs">
              <span className="text-text-muted">Calculated Ellipsoid Volume Preview:</span>
              <span className="font-mono font-bold tabular-nums text-[#BD473B] dark:text-[#E0AEB2]">
                {previewVolume} mm³ <span className="font-normal text-[10px] text-text-muted">(π/6·L·W·D)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Hero & Workflow Guide (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Execution Card */}
          <div className="bg-gradient-to-b from-blue-500/10 via-surface to-surface border border-[#8FDBF6]/50 dark:border-[#2D4C5E] rounded-3xl p-6 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#040304] dark:bg-[#8FDBF6] flex items-center justify-center text-white dark:text-[#040304] mx-auto shadow-md">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-text">Launch Live Assessment</h3>
              <p className="text-xs text-text-secondary mt-1">
                Initiate the simulated ultrasound scanning loop for{' '}
                <strong className="text-text">{selectedPatient?.full_name}</strong>
              </p>
            </div>

            <div className="bg-surface border border-theme rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-text-muted">Selected Duration:</span>
                <span className="font-bold font-mono tabular-nums text-text">{durationSeconds} seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Acoustic Plane:</span>
                <span className="font-mono text-text">Sagittal & Transverse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Expected Calipers:</span>
                <span className="font-mono tabular-nums text-text">{lNum} × {wNum} mm</span>
              </div>
              <div className="flex justify-between border-t border-theme pt-2">
                <span className="text-text-muted">Idempotency Protocol:</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                  Guaranteed Single Delivery
                </span>
              </div>
            </div>

            {/* Big Prominent Action Button */}
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={!selectedPatient}
              className="w-full py-4 px-6 rounded-2xl bg-[#040304] text-white hover:bg-neutral-800 dark:bg-[#8FDBF6] dark:text-[#040304] dark:hover:bg-[#BCE9F9] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
              <span>Start Assessment ({durationSeconds}s)</span>
            </button>
          </div>

          {/* Latest Session Feedback Card (If run) */}
          {latestAssessment && (
            <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Last Assessment Ingested</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                  Twin State v{latestAssessment.twin_version.version_number}
                </span>
              </div>

              <p className="text-xs text-text-secondary">
                Observation successfully recorded on{' '}
                {new Date(latestAssessment.observation.observed_at).toLocaleTimeString()}.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigate('/twin')}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#040304] text-white dark:bg-[#8FDBF6] dark:text-[#040304] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Open 3D Twin</span>
                </button>
                <button
                  onClick={() => navigate('/observations')}
                  className="flex-1 py-2 px-3 rounded-xl border border-theme bg-surface hover:bg-surface-hover text-text text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Compare</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Workflow Sequence Guide */}
          <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">
              Core Digital-Twin Loop
            </h4>
            <div className="space-y-2 text-xs text-text-secondary">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-[10px] font-bold text-text shrink-0 mt-0.5">
                  1
                </div>
                <span>Start assessment to run live ultrasound sector visualization.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-[10px] font-bold text-text shrink-0 mt-0.5">
                  2
                </div>
                <span>Countdown timer executes across 4 acoustic calibration phases.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-[10px] font-bold text-text shrink-0 mt-0.5">
                  3
                </div>
                <span>Backend persists observation, computes volume, and creates twin-state version.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-surface-secondary border border-theme flex items-center justify-center text-[10px] font-bold text-text shrink-0 mt-0.5">
                  4
                </div>
                <span>Interactive 3D model immediately updates to reflect the new lesion geometry.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focused Scanning Modal Component */}
      {selectedPatient && (
        <ScanningModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          patient={selectedPatient}
          durationSeconds={durationSeconds}
          onAssessmentCompleted={handleAssessmentCompleted}
          targetLengthMm={lNum}
          targetWidthMm={wNum}
          targetDepthMm={dNum}
        />
      )}
    </div>
  );
};
