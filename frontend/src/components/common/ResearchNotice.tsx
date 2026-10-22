import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ResearchNotice: React.FC = () => {
  return (
    <div className="bg-[#FEF7EE] border-b border-[#E7ECEF] px-4 py-1.5 text-xs text-[#697780] flex items-center justify-between z-40 select-none">
      <div className="flex items-center gap-2 mx-auto text-[11px]">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#B77B36]" />
        <span className="font-bold tracking-wider uppercase text-[10px] bg-[#B77B36]/15 text-[#B77B36] px-1.5 py-0.5 rounded">
          Research Concept
        </span>
        <span>
          POLYPULSE is a research and software proof of concept. Demonstration assessments and illustrative geometry are not clinical findings and must not be used for diagnosis or treatment decisions.
        </span>
      </div>
    </div>
  );
};
