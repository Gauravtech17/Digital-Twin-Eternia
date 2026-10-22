import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot,
} from 'recharts';
import { Observation } from '../../api/types';
import { Activity, TrendingUp, Info } from 'lucide-react';

interface LongitudinalChartProps {
  observations: Observation[];
  className?: string;
  compact?: boolean;
}

type MetricType = 'length' | 'width' | 'volume';

export const LongitudinalChart: React.FC<LongitudinalChartProps> = ({
  observations,
  className = '',
  compact = false,
}) => {
  const [metric, setMetric] = useState<MetricType>('length');

  // Format data for Recharts, sorting chronologically
  const chartData = [...observations]
    .sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
    .map((obs) => {
      const d = new Date(obs.observed_at);
      const dateLabel = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = d.toLocaleString();

      return {
        id: obs.id,
        date: dateLabel,
        fullDate,
        length: Number(obs.length_mm.toFixed(1)),
        width: Number(obs.width_mm.toFixed(1)),
        depth: obs.depth_mm ? Number(obs.depth_mm.toFixed(1)) : null,
        volume: obs.measurements?.volume_mm3
          ? Number(obs.measurements.volume_mm3.toFixed(1))
          : null,
        source: obs.source,
        confidence: obs.measurement_confidence,
      };
    });

  if (chartData.length < 2) {
    return (
      <div
        className={`p-6 rounded-2xl bg-surface-secondary border border-theme flex flex-col items-center justify-center text-center text-text-secondary ${className}`}
      >
        <Activity className="w-8 h-8 text-[#8E9BA4] mb-2 opacity-60" />
        <h4 className="text-xs font-bold text-text">Longitudinal Trend Visualisation</h4>
        <p className="text-[11px] text-text-muted mt-1 max-w-sm">
          A minimum of two serial observations is required to compute longitudinal differential trends.
        </p>
      </div>
    );
  }

  const metricLabel =
    metric === 'length'
      ? 'Longest Dimension (L)'
      : metric === 'width'
      ? 'Width Dimension (W)'
      : 'Derived Volume (V)';

  const metricUnit = metric === 'volume' ? 'mm³' : 'mm';
  const metricColor = metric === 'volume' ? '#B77B36' : '#2F8F83';

  return (
    <div className={`p-4 rounded-3xl bg-surface border border-theme shadow-xs space-y-3 ${className}`}>
      {/* Metric Toggle & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#2F8F83]" />
          <div>
            <h3 className="text-xs font-bold text-text">Serial Observation Trajectory</h3>
            <p className="text-[10px] text-text-muted">
              Discrete serial observations recorded over time
            </p>
          </div>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-secondary border border-theme text-xs">
          <button
            type="button"
            onClick={() => setMetric('length')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              metric === 'length'
                ? 'bg-white text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            L (mm)
          </button>
          <button
            type="button"
            onClick={() => setMetric('width')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              metric === 'width'
                ? 'bg-white text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            W (mm)
          </button>
          <button
            type="button"
            onClick={() => setMetric('volume')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              metric === 'volume'
                ? 'bg-white text-[#21685F] shadow-xs font-bold border border-[#DDE7E5]'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Vol (mm³)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={compact ? 'h-44 w-full' : 'h-56 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDE7E5" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: '#DDE7E5' }}
              tick={{ fill: '#71817D', fontSize: 10, fontFamily: 'Inter' }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#DDE7E5' }}
              tick={{ fill: '#71817D', fontSize: 10, fontFamily: 'Inter' }}
              unit={` ${metricUnit}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload;
                return (
                  <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-[#DDE7E5] shadow-lg text-xs space-y-1 select-none font-sans">
                    <div className="text-[10px] text-[#71817D] font-mono">{pt.fullDate}</div>
                    <div className="font-bold text-[#20332F] flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: metricColor }}
                      />
                      <span>
                        {metricLabel}:{' '}
                        <strong className="font-mono tabular-nums">
                          {pt[metric] !== null ? `${pt[metric]} ${metricUnit}` : 'Omitted'}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[10px] text-[#71817D] pt-1 border-t border-[#DDE7E5] flex items-center justify-between gap-4">
                      <span>Source: {pt.source}</span>
                      <span>Conf: {(pt.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={metricColor}
              strokeWidth={2.2}
              dot={{
                r: 4.5,
                fill: '#FFFFFF',
                stroke: metricColor,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6.5,
                fill: metricColor,
                stroke: '#FFFFFF',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Discrete Points Clarification Notice */}
      <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-theme">
        <span>Discrete observations plotted. Does not represent continuous biological monitoring.</span>
        <span className="font-mono tabular-nums">{chartData.length} Data Points</span>
      </div>
    </div>
  );
};
