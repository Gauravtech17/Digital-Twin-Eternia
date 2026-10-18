import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { usePatient } from '../context/PatientContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { Observation, TwinStateVersion, ReviewRecord } from '../api/types';
import {
  Smartphone,
  Calendar,
  Download,
  Box,
  HelpCircle,
  FileText,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PatientPortalPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { theme } = useTheme();

  const [observations, setObservations] = useState<Observation[]>([]);
  const [twin, setTwin] = useState<TwinStateVersion | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedPatient) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [obs, t, r] = await Promise.all([
          api.getObservations(selectedPatient.id).catch(() => []),
          api.getCurrentTwinState(selectedPatient.id).catch(() => null),
          api.getReviews(selectedPatient.id).catch(() => []),
        ]);
        setObservations(obs);
        setTwin(t);
        setReviews(r);
      } catch (e) {
        console.error('Failed to load patient portal data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedPatient?.id]);

  const chartData = observations.map((o) => ({
    date: new Date(o.observed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    length_mm: o.length_mm,
    volume_mm3: o.measurements?.volume_mm3 || null,
  }));

  const latestObs = observations[observations.length - 1];
  const latestRev = reviews[0];

  const pdfUrl = selectedPatient ? api.getPdfReportUrl(selectedPatient.id) : '#';

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Mobile Top Bar */}
      <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
            Patient Mobile View
          </span>
          <h1 className="text-xl font-bold text-text mt-1">Hello, {selectedPatient?.full_name}</h1>
          <p className="text-xs text-text-secondary">MRN: {selectedPatient?.mrn}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent flex items-center justify-center text-accent">
          <Smartphone className="w-5 h-5" />
        </div>
      </div>

      {/* Monitoring Status Card */}
      <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-theme pb-2.5">
          <span className="text-xs font-semibold text-text">Serial Monitoring Status</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Surveillance
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-surface-secondary border border-theme">
            <span className="text-[10px] text-text-muted block">Latest Dimension (L)</span>
            <div className="text-xl font-bold text-text">
              {latestObs ? `${latestObs.length_mm.toFixed(1)} mm` : '—'}
            </div>
            <span className="text-[10px] text-text-muted">
              {latestObs ? new Date(latestObs.observed_at).toLocaleDateString() : 'No scans'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-surface-secondary border border-theme">
            <span className="text-[10px] text-text-muted block">Clinician Review</span>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {latestRev?.status || 'PENDING'}
            </div>
            <span className="text-[10px] text-text-muted">
              {latestRev ? new Date(latestRev.created_at).toLocaleDateString() : 'Awaiting review'}
            </span>
          </div>
        </div>

        {/* 3D Model Quick Action */}
        <Link
          to="/twin"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-accent-main hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Box className="w-4 h-4" />
          Explore 3D Digital Twin Model
        </Link>
      </div>

      {/* Size Trend Chart */}
      <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text">Longitudinal Size Trend</span>
          <span className="text-[10px] text-text-muted font-mono">{observations.length} serial scans</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#272438' : '#F1EFF7'} vertical={false} />
              <XAxis dataKey="date" fontSize={10} stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
              <YAxis fontSize={10} stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1E1B2E' : '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="length_mm"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8B5CF6' }}
                name="Length (mm)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Downloadable Reports Section */}
      <div className="bg-surface border border-theme rounded-3xl p-5 shadow-xs space-y-3">
        <span className="text-xs font-bold text-text block">Available Clinical Reports</span>
        <div className="p-3.5 rounded-2xl bg-surface-secondary border border-theme flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-accent" />
            <div>
              <div className="text-xs font-semibold text-text">Serial Twin Summary Report</div>
              <div className="text-[10px] text-text-muted">PDF Format • Complete Provenance</div>
            </div>
          </div>
          <a
            href={pdfUrl}
            download={`POLYPULSE_Report_${selectedPatient?.mrn}.pdf`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-main hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </div>
      </div>

      {/* Plain Language Educational Section: What this can and cannot tell you */}
      <div className="bg-surface-secondary border border-theme rounded-3xl p-5 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-text">
          <Info className="w-4 h-4 text-accent" />
          <span>What This Can and Cannot Tell You</span>
        </div>

        <div className="space-y-2 text-text-secondary text-[11px] leading-relaxed">
          <div className="p-3 rounded-2xl bg-surface border border-theme space-y-1">
            <strong className="text-text font-semibold">What POLYPULSE does:</strong>
            <p>
              It organizes your serial ultrasound scans into a digital timeline and visual 3D illustration so that your healthcare clinician can track physical size measurements over time.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-theme space-y-1">
            <strong className="text-rose-600 dark:text-rose-400 font-semibold">What POLYPULSE cannot do:</strong>
            <ul className="list-disc list-inside space-y-1">
              <li>It <strong>does not provide a diagnosis</strong> or medical opinion.</li>
              <li>It <strong>does not calculate cancer risk or malignancy probability</strong>.</li>
              <li>It <strong>does not replace direct medical advice</strong> from your gynecologist.</li>
            </ul>
          </div>
        </div>

        <p className="text-[10px] text-text-muted">
          Always discuss questions regarding symptoms, changes, or medical treatments directly with your licensed doctor.
        </p>
      </div>
    </div>
  );
};
