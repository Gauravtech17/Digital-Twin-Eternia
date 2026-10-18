import React, { useEffect, useState } from 'react';
import { usePatient } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ReviewRecord, ReviewStatus } from '../api/types';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  FileText,
  AlertCircle,
  Save,
} from 'lucide-react';

export const ClinicalReviewPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { currentUser } = useAuth();

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Review Edit Form
  const [activeStatus, setActiveStatus] = useState<ReviewStatus>('REVIEWED');
  const [reviewNote, setReviewNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const [revs, audits] = await Promise.all([
        api.getReviews(selectedPatient.id).catch(() => []),
        api.getAuditTrail(selectedPatient.id).catch(() => []),
      ]);
      setReviews(revs);
      setAuditEvents(audits);
      if (revs.length > 0) {
        setActiveStatus(revs[0].status);
        setReviewNote(revs[0].review_notes || '');
      }
    } catch (e) {
      console.error('Failed to load review data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPatient?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      setSaving(true);
      setSaveSuccess(null);
      await api.submitReview({
        patient_id: selectedPatient.id,
        status: activeStatus,
        review_notes: reviewNote.trim() || 'Verified longitudinal lesion stability and measurement confidence.',
      });
      setSaveSuccess('Clinical review sign-off saved and audit event recorded.');
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Clinical Review & Governance Queue
            </h1>
            <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
              Clinician Workflow
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Document clinician verification notes, sign off on tolerance deltas, and audit record updates
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-surface text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-text font-medium">Reviewing as: {currentUser?.full_name || 'Dr. Sarah Chen'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Review Sign-off Form */}
        <div className="lg:col-span-2 bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-5">
          <div className="border-b border-theme pb-3">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-accent" />
              Longitudinal Sign-off & Notes
            </h2>
            <p className="text-xs text-text-secondary">
              Review records are version-anchored and permanently appended to the patient audit log
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text mb-2">Review Status Verdict</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { status: 'REVIEWED', label: 'Reviewed & Verified', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' },
                  { status: 'IN_REVIEW', label: 'In Review / Consultation', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
                  { status: 'PENDING', label: 'Pending Assessment', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' },
                ].map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => setActiveStatus(item.status as ReviewStatus)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      activeStatus === item.status ? item.color + ' ring-2 ring-purple-500/20' : 'border-theme bg-surface hover:bg-surface-secondary text-text'
                    }`}
                  >
                    <div className="font-bold">{item.status}</div>
                    <div className="text-[10px] opacity-75 font-normal mt-0.5">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text mb-1">
                Clinical Observation Assessment & Surveillance Notes
              </label>
              <textarea
                rows={5}
                required
                placeholder="Document clinical impressions, image quality verification, serial dimension deltas, and recommended follow-up schedule..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full text-xs border border-theme rounded-xl p-3 bg-surface text-text leading-relaxed"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Note: Research prototype policy strictly prohibits entering unsupported malignancy assertions or speculative prognostic guarantees.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-theme">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-main hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Recording Sign-off...' : 'Submit Clinical Sign-Off'}
              </button>
            </div>
          </form>

          {/* Historical Review Notes Feed */}
          <div className="border-t border-theme pt-4">
            <h3 className="text-xs font-bold text-text mb-3">Previous Verification Records</h3>
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-surface-secondary border border-theme text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-accent">
                      {r.status}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    {r.review_notes || 'No notes entered.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Structured Audit Trail (PHI Scrubbed) */}
        <div className="lg:col-span-1 bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-theme pb-3">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              Governance Audit Log
            </h2>
            <p className="text-[11px] text-text-secondary">
              Immutable structured log with zero PHI storage
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditEvents.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-6">
                No audit events recorded.
              </div>
            ) : (
              auditEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl bg-surface-secondary border border-theme text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-accent">{ev.event_type}</span>
                    <span className="text-text-muted">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Entity: {ev.entity_type} #{ev.entity_id}
                  </div>
                  <div className="text-[9px] text-text-muted bg-surface p-1 rounded border border-theme truncate">
                    {ev.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
