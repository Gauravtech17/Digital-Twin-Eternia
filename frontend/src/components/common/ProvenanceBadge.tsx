import React from 'react';
import { ProvenanceType, DataClass } from '../../api/types';

interface ProvenanceBadgeProps {
  type?: ProvenanceType | DataClass | string;
  size?: 'xs' | 'sm' | 'md';
  showDetails?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type = 'DERIVED',
  size = 'xs',
  showDetails = false,
}) => {
  const normType = (type || 'DERIVED').toUpperCase();

  let styles = 'bg-[#E8F5F1] text-[#21685F] border-[#DDE7E5]';
  let label = 'DERIVED';
  let tooltip = 'Computed via mathematical formula (e.g. ellipsoid formula)';

  if (normType.includes('MANUAL')) {
    styles = 'bg-surface-secondary text-[#20332F] border-theme';
    label = 'MANUAL';
    tooltip = 'Directly input by user or medical clinician';
  } else if (normType.includes('MEASURED')) {
    styles = 'bg-[#E8F5F1] text-[#21685F] border-[#21685F]/30';
    label = 'MEASURED';
    tooltip = 'Direct physical or calibrated sensor measurement';
  } else if (normType.includes('SIMULATED')) {
    styles = 'bg-[#FEF7EE] text-[#B77B36] border-[#B77B36]/30';
    label = 'SIMULATED';
    tooltip = 'Software simulation of a proposed wearable ultrasound source';
  } else if (normType.includes('PREDICTED')) {
    styles = 'bg-[#FEF7EE] text-[#B77B36] border-[#B77B36]/30 border-dashed';
    label = 'PREDICTED';
    tooltip = 'Experimental baseline projection with statistical uncertainty interval';
  } else if (normType.includes('ILLUSTRATIVE')) {
    styles = 'bg-[#F5F9F8] text-[#71817D] border-[#DDE7E5]';
    label = 'ILLUSTRATIVE';
    tooltip = 'Procedural anatomical illustration — not a patient-specific organ reconstruction';
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md border ${styles} ${sizeClasses[size]} select-none`}
      title={tooltip}
    >
      {label}
      {showDetails && <span className="ml-1 text-[8px] opacity-75 font-normal">({tooltip})</span>}
    </span>
  );
};
