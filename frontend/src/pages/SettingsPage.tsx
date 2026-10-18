import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { SystemSettings } from '../api/types';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Sliders,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Save,
  HelpCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, availableUsers, switchUser } = useAuth();

  const [toleranceMm, setToleranceMm] = useState<string>('1.0');
  const [lowConf, setLowConf] = useState<string>('0.60');
  const [lowQual, setLowQual] = useState<string>('0.50');
  const [missingDepthStrategy, setMissingDepthStrategy] = useState<string>('ASSUME_WIDTH');

  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await api.getSettings();
        setToleranceMm(s.tolerance_growth_mm.toString());
        setLowConf(s.low_confidence_threshold.toString());
        setLowQual(s.low_quality_threshold.toString());
        setMissingDepthStrategy(s.missing_depth_strategy);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(null);
      await api.updateSettings({
        tolerance_growth_mm: parseFloat(toleranceMm),
        low_confidence_threshold: parseFloat(lowConf),
        low_quality_threshold: parseFloat(lowQual),
        missing_depth_strategy: missingDepthStrategy,
      });
      setSavedSuccess('System thresholds successfully updated in database.');
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            System Settings & Clinical Governance
          </h1>
          <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
            Configuration
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure demonstration alert thresholds, theme tokens, and active demo user profiles
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Visual Theme Settings Card */}
      <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-theme pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Visual Appearance & Themes</h2>
            <p className="text-xs text-text-secondary">
              Polished white light theme (default) or high-contrast research dark theme
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-surface-secondary hover:bg-surface-hover text-xs font-semibold text-text transition-colors shadow-xs"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-purple-600" />
                <span>Switch to Dark Theme</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Switch to Light Theme</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-surface-secondary border border-theme space-y-1">
            <span className="font-bold text-text">Light Theme Design Tokens (Default)</span>
            <p className="text-[11px] text-text-secondary">
              Clean white (#FFFFFF), secondary (#F7F6FA), charcoal typography (#24212D), and violet accent (#8B5CF6).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-secondary border border-theme space-y-1">
            <span className="font-bold text-text">Dark Theme Design Tokens</span>
            <p className="text-[11px] text-text-secondary">
              Deep research slate (#0E0D15), muted card (#1D1B2C), and radiant violet highlights (#A78BFA).
            </p>
          </div>
        </div>
      </div>

      {/* Configurable Alert Thresholds Card */}
      <form onSubmit={handleSaveSettings} className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-5">
        <div className="border-b border-theme pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            Configurable Alert & Sensitivity Thresholds
          </h2>
          <p className="text-xs text-text-secondary">
            Explicit trigger thresholds evaluated by the alert rule engine for each processed observation
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
          <strong>DEMONSTRATION VALUE NOTICE:</strong> The default growth tolerance of 1.0 mm is a documented demonstration sensitivity for prototyping purposes, not an oncological guideline.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-text mb-1">
              Growth Tolerance (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={toleranceMm}
              onChange={(e) => setToleranceMm(e.target.value)}
              className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Triggers CHANGE_EXCEEDS_TOLERANCE if consecutive delta ≥ threshold.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">
              Low Confidence Threshold
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              required
              value={lowConf}
              onChange={(e) => setLowConf(e.target.value)}
              className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Triggers DATA_QUALITY_WARNING if measurement confidence falls below this value.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">
              Low Image Quality Threshold
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              required
              value={lowQual}
              onChange={(e) => setLowQual(e.target.value)}
              className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Triggers warning when speckle/acoustic signal quality is sub-optimal.
            </p>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-text mb-1 text-xs">
            Missing Lesion Depth Calculation Strategy
          </label>
          <select
            value={missingDepthStrategy}
            onChange={(e) => setMissingDepthStrategy(e.target.value)}
            className="w-full sm:w-80 text-xs border border-theme rounded-xl p-2.5 bg-surface text-text"
          >
            <option value="ASSUME_WIDTH">ASSUME_WIDTH: Explicitly evaluate D = W (flagged assumption)</option>
            <option value="OMIT_VOLUME">OMIT_VOLUME: Do not calculate volume if depth is absent</option>
          </select>
        </div>

        <div className="flex justify-end pt-3 border-t border-theme">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-main hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating Database...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Demo User Switcher Card */}
      <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-theme pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-accent" />
            Demo User Switching & RBAC Role Simulation
          </h2>
          <p className="text-xs text-text-secondary">
            Switch between simulated personas. Clearly labeled demo-only access, not production-grade clinical security.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableUsers.map((user) => {
            const isActive = currentUser?.username === user.username;
            return (
              <div
                key={user.id}
                onClick={() => switchUser(user.username)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-accent-subtle border-accent ring-2 ring-purple-500/20'
                    : 'bg-surface-secondary border-theme hover:bg-surface-hover'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-surface border border-theme">
                      {user.role}
                    </span>
                    {isActive && <span className="text-[10px] font-bold text-accent">Active</span>}
                  </div>
                  <h3 className="font-semibold text-text text-xs mt-2">{user.full_name}</h3>
                  <p className="text-[11px] text-text-muted font-mono">{user.email}</p>
                </div>
                <div className="mt-3 text-[10px] text-text-secondary">
                  {user.role === 'PATIENT' ? 'Restricted to own patient record' : 'Full clinician cohort access'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
