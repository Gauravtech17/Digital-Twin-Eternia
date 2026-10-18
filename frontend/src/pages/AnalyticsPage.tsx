import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  Area,
  ComposedChart,
} from 'recharts';
import { usePatient } from '../context/PatientContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { AnalyticsSummary, LongitudinalDataPoint, PredictionPoint } from '../api/types';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  TrendingUp,
  Activity,
  Layers,
  Sliders,
  Table as TableIcon,
  HelpCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showTableAlt, setShowTableAlt] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedPatient) return;
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.getAnalytics(selectedPatient.id);
        setAnalytics(data);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [selectedPatient?.id]);

  // Combine observed series and experimental predictions for continuous charting
  const chartData = React.useMemo(() => {
    if (!analytics) return [];

    const points = analytics.series.map((s) => ({
      date: new Date(s.observed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      elapsed_days: s.elapsed_days,
      observed_length: s.length_mm,
      width_mm: s.width_mm,
      volume_mm3: s.volume_mm3,
      growth_rate: s.growth_rate_mm_per_month,
      predicted_length: null as number | null,
      lower_bound: null as number | null,
      upper_bound: null as number | null,
      isPrediction: false,
    }));

    if (analytics.series.length > 0 && analytics.predictions.length > 0) {
      // Connect latest observation to prediction baseline
      const latestObs = analytics.series[analytics.series.length - 1];
      points[points.length - 1].predicted_length = latestObs.length_mm;
      points[points.length - 1].lower_bound = latestObs.length_mm;
      points[points.length - 1].upper_bound = latestObs.length_mm;

      analytics.predictions.forEach((pred) => {
        points.push({
          date: new Date(pred.projected_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' (Pred)',
          elapsed_days: latestObs.elapsed_days + pred.horizon_days,
          observed_length: null as any,
          width_mm: null as any,
          volume_mm3: null as any,
          growth_rate: null as any,
          predicted_length: pred.predicted_longest_dimension_mm,
          lower_bound: pred.lower_bound_mm,
          upper_bound: pred.upper_bound_mm,
          isPrediction: true,
        });
      });
    }

    return points;
  }, [analytics]);

  const gridColor = theme === 'dark' ? '#272438' : '#E5E7EB';
  const textColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Longitudinal Analytics & Trend Forecast
            </h1>
            <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
              Persisted Data Only
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Serial size trajectories, volume progression, interval rates, and transparent baseline regression
          </p>
        </div>

        <button
          onClick={() => setShowTableAlt(!showTableAlt)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-surface hover:bg-surface-secondary text-text text-xs font-semibold shadow-xs transition-all"
        >
          <TableIcon className="w-3.5 h-3.5" />
          {showTableAlt ? 'Show Charts' : 'Show Accessible Table'}
        </button>
      </div>

      {/* Main Longitudinal Dimension Chart */}
      <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Longest Dimension Trajectory & Experimental Baseline (mm)
            </h2>
            <p className="text-xs text-text-secondary">
              Solid purple line: Calibrated serial observations • Dashed rose line: Experimental linear trend baseline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ProvenanceBadge type="OBSERVED" size="xs" />
            <ProvenanceBadge type="PREDICTED" size="xs" />
          </div>
        </div>

        {/* Chart View */}
        {!showTableAlt ? (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Observation Timeline', position: 'insideBottom', offset: -10, fill: textColor, fontSize: 11 }}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={11}
                  domain={['auto', 'auto']}
                  tickLine={false}
                  label={{ value: 'Longest Dimension (mm)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1E1B2E' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3B3654' : '#E5E7EB',
                    borderRadius: '12px',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />

                {/* Uncertainty Band for experimental prediction */}
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  stroke="none"
                  fill="#FDA4AF"
                  fillOpacity={theme === 'dark' ? 0.15 : 0.25}
                  name="Prediction Uncertainty (95% CI)"
                />

                {/* Observed Length Line */}
                <Line
                  type="monotone"
                  dataKey="observed_length"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#8B5CF6', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 7 }}
                  name="Observed Longest Dimension (mm)"
                  connectNulls={false}
                />

                {/* Experimental Linear Projection Line */}
                <Line
                  type="linear"
                  dataKey="predicted_length"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#F43F5E' }}
                  name="Experimental Baseline Forecast (mm)"
                  connectNulls={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Accessible Table Alternative (WCAG AA) */
          <div className="overflow-x-auto border border-theme rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary text-text-muted uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date / Timeline</th>
                  <th className="py-2.5 px-4">Elapsed Days</th>
                  <th className="py-2.5 px-4">Observed L (mm)</th>
                  <th className="py-2.5 px-4">Width (mm)</th>
                  <th className="py-2.5 px-4">Volume (mm³)</th>
                  <th className="py-2.5 px-4">Rate (mm/mo)</th>
                  <th className="py-2.5 px-4">Forecast L (mm)</th>
                  <th className="py-2.5 px-4">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {chartData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-secondary/50">
                    <td className="py-2.5 px-4 font-mono">{row.date}</td>
                    <td className="py-2.5 px-4">{row.elapsed_days}d</td>
                    <td className="py-2.5 px-4 font-bold">{row.observed_length ? `${row.observed_length.toFixed(1)} mm` : '—'}</td>
                    <td className="py-2.5 px-4">{row.width_mm ? `${row.width_mm.toFixed(1)} mm` : '—'}</td>
                    <td className="py-2.5 px-4">{row.volume_mm3 ? `${row.volume_mm3.toFixed(1)} mm³` : '—'}</td>
                    <td className="py-2.5 px-4">{row.growth_rate ? `${row.growth_rate.toFixed(2)}` : '—'}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {row.predicted_length ? `${row.predicted_length.toFixed(1)} mm` : '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <ProvenanceBadge type={row.isPrediction ? 'PREDICTED' : 'OBSERVED'} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secondary Charts: Volume & Growth Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend Chart */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Derived Volume Progression (mm³)</h3>
              <p className="text-[11px] text-text-secondary">Ellipsoid formula V = (π/6)·L·W·D</p>
            </div>
            <ProvenanceBadge type="DERIVED" size="xs" />
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="observed_at"
                  stroke={textColor}
                  fontSize={10}
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke={textColor} fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1E1B2E' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3B3654' : '#E5E7EB',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume_mm3"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#10B981' }}
                  name="Volume (mm³)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Rate Chart */}
        <div className="bg-surface border border-theme rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Serial Growth Velocity (mm/month)</h3>
              <p className="text-[11px] text-text-secondary">ΔLongest Dimension / Elapsed Month Interval</p>
            </div>
            <ProvenanceBadge type="DERIVED" size="xs" />
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.series.filter((s) => s.growth_rate_mm_per_month !== null) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="observed_at"
                  stroke={textColor}
                  fontSize={10}
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke={textColor} fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1E1B2E' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3B3654' : '#E5E7EB',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="growth_rate_mm_per_month"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#F59E0B' }}
                  name="Growth Rate (mm/mo)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Experimental Prediction Methodology & Regulatory Limitations Notice */}
      <div className="bg-surface-secondary border border-theme rounded-2xl p-5 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-text">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Experimental Baseline Forecast Methodology & Documentation</span>
        </div>
        <p className="text-text-secondary leading-relaxed">
          {analytics?.experimental_model_notes}
        </p>
        <div className="p-3 rounded-xl bg-surface border border-theme text-[11px] text-text-muted space-y-1">
          <p>• <strong>Method:</strong> Ordinary Least Squares (OLS) univariate linear regression (y = β₀ + β₁·t).</p>
          <p>• <strong>Activation:</strong> Automatically enabled when ≥ 3 serial observations exist.</p>
          <p>• <strong>Boundary:</strong> Intended solely for academic time-series research. Does NOT predict malignancy, histology, or therapeutic response.</p>
        </div>
      </div>
    </div>
  );
};
