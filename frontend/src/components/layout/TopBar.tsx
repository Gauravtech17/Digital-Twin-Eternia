import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePatient } from '../../context/PatientContext';
import {
  Sun,
  Moon,
  ChevronDown,
  Menu,
  HeartPulse,
  Radio,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBarProps {
  onToggleSidebar?: () => void;
  unreadAlertCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { selectedPatient, patients, setSelectedPatientId } = usePatient();
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  return (
    <header className="h-16 border-b border-theme bg-surface sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-colors duration-150">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-theme text-text-secondary hover:text-text hover:bg-surface-secondary md:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-accent-main flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-text">POLYPULSE</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.2 bg-accent-subtle accent-color rounded-md border border-accent">
                Twin 2026
              </span>
            </div>
            <p className="text-[10px] text-text-secondary -mt-0.5 hidden sm:block">Living Lesion Digital Twin</p>
          </div>
        </Link>
      </div>

      {/* Middle: Patient Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-theme bg-surface-secondary hover:bg-surface-hover text-xs transition-all cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-text">
              {selectedPatient ? selectedPatient.full_name : 'Select Patient'}
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              {selectedPatient ? `${selectedPatient.mrn} • ${selectedPatient.date_of_birth}` : 'No patient'}
            </div>
          </div>
          <div className="sm:hidden text-xs font-semibold text-text">
            {selectedPatient?.mrn}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        </button>

        {patientDropdownOpen && (
          <div
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-surface border border-theme rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onMouseLeave={() => setPatientDropdownOpen(false)}
          >
            <div className="px-3.5 py-1.5 border-b border-theme text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Select Patient Cohort
            </div>
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setPatientDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-surface-secondary transition-colors flex items-center justify-between cursor-pointer ${
                    selectedPatient?.id === p.id ? 'bg-accent-subtle accent-color font-bold' : 'text-text'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{p.full_name}</div>
                    <div className="text-[10px] text-text-muted font-mono">{p.mrn} • {p.date_of_birth}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-theme text-text-secondary">
                    {p.observation_count} scans
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Device Status & Dark/Light Theme Switch */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Device Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-secondary border border-theme text-[11px] text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Device: Ready</span>
        </div>

        {/* Dark/Light Theme Switch */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-theme text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          aria-label="Toggle visual theme"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-[#2F8F83] hover:text-[#21685F]" />
          ) : (
            <Sun className="w-4 h-4 text-[#B77B36] hover:text-amber-500" />
          )}
        </button>
      </div>
    </header>
  );
};
