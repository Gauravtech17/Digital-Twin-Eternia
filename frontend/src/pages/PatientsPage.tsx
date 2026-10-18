import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { Patient } from '../api/types';
import {
  Users,
  Search,
  Plus,
  Box,
  Calendar,
  ChevronRight,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const { patients, selectedPatientId, setSelectedPatientId, reloadPatients } = usePatient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // New Patient Form State
  const [newMrn, setNewMrn] = useState('');
  const [newName, setNewName] = useState('');
  const [newDob, setNewDob] = useState('1995-01-01');
  const [newSex, setNewSex] = useState('Female');
  const [newNotes, setNewNotes] = useState('');

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const created = await api.createPatient({
        mrn: newMrn.trim(),
        full_name: newName.trim(),
        date_of_birth: newDob,
        biological_sex: newSex,
        notes: newNotes.trim() || undefined,
      });
      await reloadPatients();
      setSelectedPatientId(created.id);
      setModalOpen(false);
      // Reset form
      setNewMrn('');
      setNewName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Patient Cohort Directory
            </h1>
            <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
              Fictional Demo Records
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Longitudinal surveillance profiles for endometrial lesion monitoring
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-main hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          Enroll New Patient
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-surface border border-theme rounded-2xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cohort by patient name or Medical Record Number (MRN)..."
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-theme rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-surface border border-theme rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-secondary border-b border-theme text-text-muted uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient / MRN</th>
                <th className="py-3 px-4">DOB / Demographics</th>
                <th className="py-3 px-4">Serial Scans</th>
                <th className="py-3 px-4">Latest Observation</th>
                <th className="py-3 px-4">Clinical Review</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatientId;
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-surface-secondary/60 transition-colors ${
                      isSelected ? 'bg-accent-subtle/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-accent-main shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-text text-sm">
                            {p.full_name}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono">{p.mrn}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-text-secondary">
                      <div>{p.date_of_birth}</div>
                      <div className="text-[10px] text-text-muted">{p.biological_sex}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-secondary border border-theme font-mono font-medium">
                        {p.observation_count} records
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-text-secondary">
                      {p.latest_observation_date
                        ? new Date(p.latest_observation_date).toLocaleDateString()
                        : 'No scans yet'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.latest_review_status === 'REVIEWED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {p.latest_review_status || 'PENDING'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-accent-main text-white border-accent-main'
                              : 'border-theme bg-surface hover:bg-surface-secondary text-text'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            navigate('/twin');
                          }}
                          className="p-1.5 rounded-lg border border-theme hover:bg-surface-secondary text-text-secondary hover:text-text transition-colors"
                          title="Open 3D Twin"
                        >
                          <Box className="w-4 h-4 text-accent" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-theme rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <h3 className="text-base font-bold text-text">Enroll New Patient</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-muted hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text mb-1">
                  Medical Record Number (MRN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRN-2026-905"
                  value={newMrn}
                  onChange={(e) => setNewMrn(e.target.value)}
                  className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-text mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Claire Bennett"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-text mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text"
                  />
                </div>
                <div>
                  <label className="block font-medium text-text mb-1">Biological Sex</label>
                  <select
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value)}
                    className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text"
                  >
                    <option value="Female">Female</option>
                    <option value="Intersex">Intersex</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-text mb-1">
                  Clinical Intake Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical presentation, indication for longitudinal tracking..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs border border-theme rounded-xl p-2.5 bg-surface text-text"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme text-text hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-accent-main hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Enrolling...' : 'Save Patient Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
