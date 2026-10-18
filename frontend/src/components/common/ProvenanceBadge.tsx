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

  let styles = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  let label = 'DERIVED';
  let tooltip = 'Computed via mathematical formula (e.g. ellipsoid formula)';

  if (normType.includes('MANUAL')) {
    styles = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    label = 'MANUAL';
    tooltip = 'Directly input by user or medical clinician';
  } else if (normType.includes('MEASURED')) {
    styles = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    label = 'MEASURED';
    tooltip = 'Direct physical or calibrated sensor measurement';
  } else if (normType.includes('SIMULATED')) {
    styles = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    label = 'SIMULATED';
    tooltip = 'Software simulation of a proposed wearable ultrasound source';
  } else if (normType.includes('PREDICTED')) {
    styles = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-dashed border-rose-300 dark:border-rose-800';
    label = 'PREDICTED';
    tooltip = 'Experimental baseline projection with statistical uncertainty interval';
  } else if (normType.includes('ILLUSTRATIVE')) {
    styles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    label = 'ILLUSTRATIVE';
    tooltip = 'Procedural anatomical illustration — not a patient-specific organ reconstruction';
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center font-mono font-medium rounded-full border tracking-wide uppercase cursor-help select-none ${styles} ${sizeClasses[size]}`}
    >
      {label}
      {showDetails && <span className="ml-1 opacity-75 lowercase text-[10px]">({tooltip.split(' ')[0]})</span>}
    </span>
  );
};
