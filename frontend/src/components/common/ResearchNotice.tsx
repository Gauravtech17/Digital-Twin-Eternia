import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ResearchNotice: React.FC = () => {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between z-40 select-none">
      <div className="flex items-center gap-2 mx-auto">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold tracking-wide uppercase text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-200">
          Research Prototype
        </span>
        <span>
          Not clinically validated — Not a medical device. Provides no diagnosis, malignancy probability, or treatment instructions.
        </span>
      </div>
    </div>
  );
};
