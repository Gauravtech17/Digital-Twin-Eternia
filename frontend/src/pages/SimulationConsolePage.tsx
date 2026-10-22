import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { ScanningModal } from '../components/simulation/ScanningModal';
import { SpatialScanViewport } from '../components/simulation/SpatialScanViewport';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { SimulationIngestResponse } from '../api/types';
import {
  Radio,
  Play,
  Zap,
  Box,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#20332F]">
              Simulation Console
            </h1>
            <span className="text-[10px] font-mono uppercase bg-[#E8F5F1] text-[#2F8F83] px-2 py-0.5 rounded border border-[#C6E4DC] font-bold">
              Observation Acquisition
            </span>
          </div>
          <p className="text-xs text-[#71817D] mt-0.5">
            Configure simulated scan telemetry and execute real-time ultrasound acquisition workflow
          </p>
        </div>

        {/* Device Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#21685F]/30 bg-[#E8F5F1] text-[#21685F] text-xs shadow-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#2F8F83] animate-pulse" />
          <span>DEVICE STATUS: READY FOR SIMULATION</span>
        </div>
      </div>

      {/* Mandatory Non-Claim Medical Research Notice */}
      <div className="p-4 rounded-2xl bg-white border border-[#DDE7E5] text-xs shadow-xs flex items-start gap-3">
        <Radio className="w-5 h-5 text-[#2F8F83] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#20332F] uppercase tracking-wider text-[11px]">
              Proposed Future Wearable Architecture
            </span>
            <ProvenanceBadge type="SIMULATED" size="xs" />
          </div>
          <p className="text-[#71817D] leading-relaxed">
            Continuous uterine ultrasound wearables do not currently exist and are not clinically approved. This console functions as an explicit <strong>software simulation stand-in</strong> demonstrating how continuous telemetry streams into the POLYPULSE longitudinal math engine and updates the patient's versioned digital twin.
          </p>
        </div>
      </div>

      {/* Main Console Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Patient Target & Protocol Selection */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#20332F]">1. Target Patient Cohort</h2>
                <p className="text-xs text-[#71817D]">Select the demonstration patient for this assessment session</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F5F9F8] border border-[#DDE7E5] text-[#71817D]">
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
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none ${
                      isSelected
                        ? 'bg-[#E8F5F1] text-[#2F8F83] border-[#C6E4DC] font-bold shadow-xs'
                        : 'bg-[#F5F9F8] border-[#DDE7E5] text-[#20332F] hover:bg-[#EDF4F2]'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.full_name}</div>
                    <div className="text-[10px] text-[#71817D] font-mono mt-0.5">{p.mrn}</div>
                    <div className="mt-2 text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#DDE7E5] inline-block text-[#71817D]">
                      {p.observation_count} observations
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Configurable Scan Duration */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#20332F]">2. Scan Duration Preset</h2>
                <p className="text-xs text-[#71817D]">Configurable countdown duration for demonstration verification</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F5F9F8] border border-[#DDE7E5] text-[#71817D]">
                Step 2 of 3
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDurationSeconds(60)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none ${
                  durationSeconds === 60
                    ? 'bg-[#E8F5F1] border-[#C6E4DC] text-[#2F8F83] font-bold shadow-xs'
                    : 'bg-[#F5F9F8] border-[#DDE7E5] text-[#71817D] hover:text-[#20332F] hover:bg-[#EDF4F2]'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1 text-[#2F8F83]" />
                <div className="text-sm font-mono font-bold tabular-nums">60s</div>
                <div className="text-[10px] text-[#71817D]">Standard Protocol</div>
              </button>

              <button
                type="button"
                onClick={() => setDurationSeconds(10)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none ${
                  durationSeconds === 10
                    ? 'bg-[#E8F5F1] border-[#C6E4DC] text-[#2F8F83] font-bold shadow-xs'
                    : 'bg-[#F5F9F8] border-[#DDE7E5] text-[#71817D] hover:text-[#20332F] hover:bg-[#EDF4F2]'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-[#B77B36]" />
                <div className="text-sm font-mono font-bold tabular-nums">10s</div>
                <div className="text-[10px] text-[#B77B36] font-semibold">Demo Recommended</div>
              </button>

              <button
                type="button"
                onClick={() => setDurationSeconds(5)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none ${
                  durationSeconds === 5
                    ? 'bg-[#E8F5F1] border-[#C6E4DC] text-[#2F8F83] font-bold shadow-xs'
                    : 'bg-[#F5F9F8] border-[#DDE7E5] text-[#71817D] hover:text-[#20332F] hover:bg-[#EDF4F2]'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-[#21685F]" />
                <div className="text-sm font-mono font-bold tabular-nums">5s</div>
                <div className="text-[10px] text-[#71817D]">Fast Evaluation</div>
              </button>
            </div>
          </div>

          {/* Card 3: Simulated Lesion Parameters */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#20332F]">3. Simulated Lesion Calipers (Input Stream)</h2>
                <p className="text-xs text-[#71817D]">
                  Target dimensions that the simulated scan will measure and submit to the twin
                </p>
              </div>
              <ProvenanceBadge type="SIMULATED" size="xs" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#20332F] mb-1.5">
                  Length (L mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="35.0"
                  value={lengthMm}
                  onChange={(e) => setLengthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-[#DDE7E5] rounded-xl p-2.5 bg-[#F5F9F8] text-[#20332F] focus:outline-none focus:ring-2 focus:ring-[#2F8F83]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20332F] mb-1.5">
                  Width (W mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="30.0"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-[#DDE7E5] rounded-xl p-2.5 bg-[#F5F9F8] text-[#20332F] focus:outline-none focus:ring-2 focus:ring-[#2F8F83]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20332F] mb-1.5">
                  Depth (D mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="30.0"
                  value={depthMm}
                  onChange={(e) => setDepthMm(e.target.value)}
                  className="w-full text-sm font-mono tabular-nums border border-[#DDE7E5] rounded-xl p-2.5 bg-[#F5F9F8] text-[#20332F] focus:outline-none focus:ring-2 focus:ring-[#2F8F83]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5] flex items-center justify-between text-xs">
              <span className="text-[#71817D]">Calculated Ellipsoid Volume Preview:</span>
              <span className="font-mono font-bold tabular-nums text-[#B77B36]">
                {previewVolume} mm³ <span className="font-normal text-[10px] text-[#71817D]">(π/6·L·W·D)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Hero & Workflow Guide (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Execution Card with Pale Mint Gradient Accent */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-6 shadow-xs space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#21685F] flex items-center justify-center text-white mx-auto shadow-sm">
              <Radio className="w-8 h-8 text-[#E8F5F1] animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#20332F]">Launch Live Assessment</h3>
              <p className="text-xs text-[#71817D] mt-1">
                Initiate the simulated ultrasound scanning loop for{' '}
                <strong className="text-[#20332F]">{selectedPatient?.full_name}</strong>
              </p>
            </div>

            <div className="bg-[#F5F9F8] border border-[#DDE7E5] rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-[#71817D]">Selected Duration:</span>
                <span className="font-bold font-mono tabular-nums text-[#20332F]">{durationSeconds} seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71817D]">Acoustic Plane:</span>
                <span className="font-mono text-[#20332F]">Sagittal & Transverse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71817D]">Expected Calipers:</span>
                <span className="font-mono tabular-nums text-[#20332F]">{lNum} × {wNum} mm</span>
              </div>
              <div className="flex justify-between border-t border-[#DDE7E5] pt-2">
                <span className="text-[#71817D]">Idempotency Protocol:</span>
                <span className="text-[10px] font-mono text-[#21685F] font-semibold">
                  Guaranteed Single Delivery
                </span>
              </div>
            </div>

            {/* Big Prominent Action Button */}
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={!selectedPatient}
              className="w-full py-4 px-6 rounded-2xl bg-[#21685F] text-white hover:bg-[#1B544D] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3 group hover:scale-[1.01] active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none"
            >
              <Play className="w-5 h-5 fill-current text-[#E8F5F1] transition-transform group-hover:scale-110" />
              <span>Start Assessment ({durationSeconds}s)</span>
            </button>
          </div>

          {/* Latest Session Feedback Card (If run) */}
          {latestAssessment && (
            <div className="bg-white border border-[#DDE7E5] rounded-3xl p-5 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#21685F]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Last Assessment Ingested</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#E8F5F1] text-[#21685F] px-2 py-0.5 rounded font-bold border border-[#C6E4DC]">
                  Twin State v{latestAssessment.twin_version.version_number}
                </span>
              </div>

              <p className="text-xs text-[#71817D]">
                Observation successfully recorded at{' '}
                {new Date(latestAssessment.observation.observed_at).toLocaleTimeString()}.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigate('/twin')}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#21685F] text-white hover:bg-[#1B544D] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-[#E8F5F1]" />
                  <span>Open 3D Twin</span>
                </button>
                <button
                  onClick={() => navigate('/observations')}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#DDE7E5] bg-white hover:bg-[#F5F9F8] text-[#20332F] text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Compare</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Workflow Sequence Guide */}
          <div className="bg-white border border-[#DDE7E5] rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#20332F] uppercase tracking-wider">
              Core Digital-Twin Loop
            </h4>
            <div className="space-y-2 text-xs text-[#71817D]">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E8F5F1] text-[#2F8F83] border border-[#C6E4DC] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </div>
                <span>Start assessment to run live ultrasound sector visualization.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E8F5F1] text-[#2F8F83] border border-[#C6E4DC] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </div>
                <span>Countdown timer executes across 4 acoustic calibration phases.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E8F5F1] text-[#2F8F83] border border-[#C6E4DC] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </div>
                <span>Backend persists observation, computes volume, and creates twin-state version.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E8F5F1] text-[#2F8F83] border border-[#C6E4DC] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  4
                </div>
                <span>Interactive 3D model immediately updates to reflect the new lesion geometry.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live 3D Spatial Grid Scanning Interactive Stage with Pale Mint Header */}
      <div className="bg-white border border-[#DDE7E5] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#DDE7E5] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#20332F]">
                Live 3D Spatial Grid Scanning Simulation
              </h2>
              <span className="text-[10px] font-mono uppercase bg-[#E8F5F1] text-[#2F8F83] px-2 py-0.5 rounded border border-[#C6E4DC] font-bold">
                uterus.glb
              </span>
            </div>
            <p className="text-xs text-[#71817D] mt-0.5">
              Step-by-step 42-point serpentine raster traversal examining uterine anatomy and encountering illustrative polyp candidate
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartAssessment}
            className="px-4 py-2 rounded-xl bg-[#21685F] text-white hover:bg-[#1B544D] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2F8F83] focus-visible:outline-none"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#E8F5F1]" />
            <span>Launch Acquisition Session</span>
          </button>
        </div>

        <div className="h-[460px] sm:h-[520px] rounded-2xl overflow-hidden border border-[#DDE7E5] bg-[#F5F9F8] relative">
          <SpatialScanViewport
            durationSeconds={durationSeconds}
            targetLengthMm={lNum}
            targetWidthMm={wNum}
            targetDepthMm={dNum}
            autoStart={false}
            onInspectInTwin={() => navigate('/twin')}
            className="w-full h-full"
          />
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
