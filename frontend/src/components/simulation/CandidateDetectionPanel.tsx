import React from 'react';
import { Target, Box, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

export interface CandidateDetectionPanelProps {
  candidateFound: boolean;
  candidateId?: string;
  lengthMm: number;
  widthMm: number;
  depthMm?: number;
  onInspectInTwin?: () => void;
  isScanning?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export const CandidateDetectionPanel: React.FC<CandidateDetectionPanelProps> = ({
  candidateFound,
  candidateId = 'SYNTH-POLYP-2026-081',
  lengthMm,
  widthMm,
  depthMm = 6.8,
  onInspectInTwin,
  isScanning = false,
  isCompleted = false,
  className = '',
}) => {
  if (!candidateFound) return null;

  const effectiveDepth = depthMm || widthMm;
  const volumeMm3 = ((Math.PI / 6) * lengthMm * widthMm * effectiveDepth).toFixed(1);

  return (
    <div
      className={`bg-white/95 backdrop-blur-md border border-[#DDE7E5] rounded-2xl p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#DDE7E5] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FAF0E6] border border-[#F0D5C0] flex items-center justify-center text-[#B77B36]">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-[#21685F]" />
            ) : (
              <Target className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#20332F]">
                {isCompleted ? 'Simulation Detection Complete' : 'Candidate Region Encountered'}
              </span>
              <ProvenanceBadge type="SIMULATED" size="xs" />
            </div>
            <span className="text-[10px] font-mono text-[#71817D] block">
              ID: {candidateId}
            </span>
          </div>
        </div>

        {isScanning && (
          <span className="text-[9px] font-mono uppercase bg-[#FAF0E6] text-[#B77B36] font-bold px-2 py-0.5 rounded-full border border-[#F0D5C0] animate-pulse">
            Active Dwell
          </span>
        )}
      </div>

      {/* Structured Synthetic Measurements */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center font-mono">
        <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5]">
          <span className="text-[9px] text-[#71817D] block font-sans">Length (L)</span>
          <span className="font-bold text-xs text-[#20332F] tabular-nums">
            {lengthMm.toFixed(1)} <span className="text-[8px] text-[#71817D] font-normal">mm</span>
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5]">
          <span className="text-[9px] text-[#71817D] block font-sans">Width (W)</span>
          <span className="font-bold text-xs text-[#20332F] tabular-nums">
            {widthMm.toFixed(1)} <span className="text-[8px] text-[#71817D] font-normal">mm</span>
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5]">
          <span className="text-[9px] text-[#71817D] block font-sans">Depth (D)</span>
          <span className="font-bold text-xs text-[#20332F] tabular-nums">
            {effectiveDepth.toFixed(1)} <span className="text-[8px] text-[#71817D] font-normal">mm</span>
          </span>
        </div>

        <div className="p-2 rounded-xl bg-[#FAF0E6] border border-[#F0D5C0]">
          <span className="text-[9px] text-[#B77B36] block font-sans font-semibold">Volume (V)</span>
          <span className="font-bold text-xs text-[#B77B36] tabular-nums">
            {volumeMm3} <span className="text-[8px] text-[#B77B36] font-normal">mm³</span>
          </span>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Provenance Notice */}
      <div className="flex items-start gap-2 p-2 rounded-xl bg-[#F5F9F8] border border-[#DDE7E5] text-[10px] text-[#71817D] leading-relaxed mb-3">
        <ShieldAlert className="w-3.5 h-3.5 text-[#B77B36] shrink-0 mt-0.5" />
        <span>
          Illustrative polyp target identified via deterministic simulation protocol. Non-diagnostic research prototype.
        </span>
      </div>

      {/* Action CTA */}
      {onInspectInTwin && (
        <button
          type="button"
          onClick={onInspectInTwin}
          className="w-full py-2 px-3 rounded-xl bg-[#21685F] text-white hover:bg-[#1A534C] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <Box className="w-3.5 h-3.5 text-white/90" />
          <span>Inspect Illustrative Lesion in Digital Twin</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E8F5F1] group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
