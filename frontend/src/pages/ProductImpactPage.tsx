import React from 'react';
import {
  Sparkles,
  Layers,
  Activity,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Scale,
  Microscope,
  ShieldAlert,
} from 'lucide-react';

export const ProductImpactPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="bg-surface border border-theme rounded-3xl p-6 sm:p-10 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2.5 py-1 rounded-full border border-accent">
            Research Scope & Impact
          </span>
          <span className="text-[10px] font-mono uppercase bg-surface-secondary text-text-muted px-2.5 py-1 rounded-full border border-theme">
            Happiest Health Challenge 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text">
          POLYPULSE — The Living Lesion Digital Twin
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          Exploring longitudinal digital twin architectures for serial endometrial lesion surveillance. Formulated as a verifiable computational prototype with strict claims governance.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1 */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-accent">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-text">Why Longitudinal Observations Matter</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Solitary cross-sectional ultrasound scans offer only an isolated dimensional snapshot. Endometrial lesions (such as polyps) exhibit biological dynamics—they may remain stationary, regress naturally, or progress over time. Tracking velocity (mm/month) across serial observations provides longitudinal context that static measurements cannot convey.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-text">How POLYPULSE Organizes Twin State</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Every incoming observation generates an immutable <code className="text-accent font-mono text-[11px]">TwinStateVersion</code>. Previous records are never overwritten. Each version persists calculated tri-axial ellipsoid volumes, consecutive dimension deltas, interval rates, and procedural coordinates for spatial illustration.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-text">Transparent Representation of Uncertainty</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Every numeric value carries an explicit provenance tag (<code className="font-mono text-[10px]">MANUAL</code>, <code className="font-mono text-[10px]">DERIVED</code>, <code className="font-mono text-[10px]">SIMULATED</code>, <code className="font-mono text-[10px]">PREDICTED</code>). When lesion depth is unmeasured, volume calculation is omitted unless an explicit flagged assumption is selected.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-text">Requirements for Future Wearables</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Continuous uterine scanning via wearable patch is a <strong>proposed future device concept</strong>. Validating such hardware would necessitate breakthroughs in conformable acoustic transducer arrays, long-term non-drying acoustic hydrogels, miniaturized beamformers, and motion artifact suppression.
          </p>
        </div>
      </div>

      {/* Limitations & Unvalidated Hypotheses Banner */}
      <div className="bg-surface-secondary border border-theme rounded-3xl p-6 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-text text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Research Hypotheses & Clinical Disclaimers</span>
        </div>
        <div className="space-y-2 text-text-secondary leading-relaxed text-[11px]">
          <p>
            • <strong>Hypothesis Only:</strong> The hypothesis that continuous or high-frequency longitudinal lesion telemetry improves diagnostic timeliness or reduces diagnostic invasiveness remains unvalidated and requires formal prospective multi-center clinical trials.
          </p>
          <p>
            • <strong>No Malignancy Equivalence:</strong> Lesion expansion does not equate to malignant transformation. Many benign polyps and leiomyomas exhibit growth under hormonal stimulation, while malignant lesions may present with minimal dimensional change.
          </p>
          <p>
            • <strong>Regulatory Standing:</strong> POLYPULSE is an academic engineering demonstration built for the Happiest Health Digital Twin Challenge 2026. It is not approved by the FDA, EMA, or CDSCO.
          </p>
        </div>
      </div>
    </div>
  );
};
