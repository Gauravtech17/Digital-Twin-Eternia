import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { Alert, AlertType } from '../api/types';
import {
  BellRing,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Filter,
  Box,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadAlerts = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const isAck = statusFilter === 'ACK' ? true : statusFilter === 'UNACK' ? false : undefined;
      const type = typeFilter === 'ALL' ? undefined : typeFilter;
      const data = await api.getAlerts(selectedPatient.id, type, isAck);
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedPatient?.id, typeFilter, statusFilter]);

  const handleToggleAcknowledge = async (alertId: number, currentStatus: boolean) => {
    try {
      await api.acknowledgeAlert(alertId, !currentStatus);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, is_acknowledged: !currentStatus, acknowledged_at: !currentStatus ? new Date().toISOString() : null }
            : a
        )
      );
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const alertTypeOptions = [
    { label: 'All Alerts', value: 'ALL' },
    { label: 'Tolerance Exceeded', value: 'CHANGE_EXCEEDS_TOLERANCE' },
    { label: 'Data Quality Warning', value: 'DATA_QUALITY_WARNING' },
    { label: 'New Observation', value: 'NEW_OBSERVATION_RECEIVED' },
    { label: 'Awaiting Review', value: 'AWAITING_CLINICIAN_REVIEW' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Tolerance & Quality Alerts
            </h1>
            <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
              Notification Center
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Documented threshold triggers, measurement delta alerts, and simulated delivery statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/twin"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme bg-surface hover:bg-surface-secondary text-text text-xs font-semibold shadow-xs"
          >
            <Box className="w-3.5 h-3.5 text-accent" />
            View in 3D Twin
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface border border-theme rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filter by Rule:
          </span>
          {alertTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-accent-subtle accent-color font-semibold border border-accent'
                  : 'text-text-secondary hover:text-text hover:bg-surface-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              statusFilter === 'ALL'
                ? 'bg-surface-secondary text-text font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('UNACK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              statusFilter === 'UNACK'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Pending ({alerts.filter((a) => !a.is_acknowledged).length})
          </button>
          <button
            onClick={() => setStatusFilter('ACK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              statusFilter === 'ACK'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Acknowledged
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-surface border border-theme rounded-2xl p-12 text-center text-xs text-text-muted">
            No alerts match the selected filter criteria.
          </div>
        ) : (
          alerts.map((alert) => {
            const isWarning = alert.severity === 'WARNING';
            const isAttention = alert.severity === 'ATTENTION';

            let cardBg = 'bg-surface border-theme';
            let badgeBg = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
            let IconComponent = Info;

            if (isWarning) {
              cardBg = alert.is_acknowledged ? 'bg-surface border-theme' : 'bg-amber-500/5 border-amber-500/30';
              badgeBg = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
              IconComponent = AlertTriangle;
            } else if (isAttention) {
              cardBg = alert.is_acknowledged ? 'bg-surface border-theme' : 'bg-rose-500/5 border-rose-500/30';
              badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
              IconComponent = ShieldAlert;
            }

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${cardBg} ${
                  alert.is_acknowledged ? 'opacity-70' : 'shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${badgeBg} shrink-0`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeBg}`}>
                          {alert.alert_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-text mt-1">{alert.title}</h3>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {alert.explanation}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted mt-2 font-mono">
                        <span>Rule: {alert.trigger_rule}</span>
                        <span>•</span>
                        <span className="text-amber-700 dark:text-amber-300">
                          {alert.simulated_notification_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleAcknowledge(alert.id, alert.is_acknowledged)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                        alert.is_acknowledged
                          ? 'border-theme bg-surface hover:bg-surface-secondary text-text-secondary'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {alert.is_acknowledged ? 'Mark Pending' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
