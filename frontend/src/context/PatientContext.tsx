import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../api/types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface PatientContextType {
  selectedPatientId: number;
  setSelectedPatientId: (id: number) => void;
  selectedPatient: Patient | null;
  patients: Patient[];
  reloadPatients: () => Promise<void>;
  isLoadingPatients: boolean;
  dataVersion: number;
  notifyDataChanged: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientIdState] = useState<number>(() => {
    const saved = localStorage.getItem('polypulse_active_patient_id');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [dataVersion, setDataVersion] = useState<number>(0);

  const notifyDataChanged = () => {
    setDataVersion((v) => v + 1);
  };

  const reloadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      const data = await api.getPatients();
      setPatients(data);

      // If current user is a patient, lock to their patient_id
      if (currentUser?.role === 'PATIENT' && currentUser.patient_id) {
        setSelectedPatientIdState(currentUser.patient_id);
      } else if (data.length > 0 && !data.some((p) => p.id === selectedPatientId)) {
        setSelectedPatientIdState(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load patient list:', e);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    reloadPatients();
  }, [currentUser]);

  const setSelectedPatientId = (id: number) => {
    if (currentUser?.role === 'PATIENT' && currentUser.patient_id && currentUser.patient_id !== id) {
      return; // Cannot switch away from own record if logged in as patient
    }
    setSelectedPatientIdState(id);
    localStorage.setItem('polypulse_active_patient_id', id.toString());
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || null;

  return (
    <PatientContext.Provider
      value={{
        selectedPatientId,
        setSelectedPatientId,
        selectedPatient,
        patients,
        reloadPatients,
        isLoadingPatients,
        dataVersion,
        notifyDataChanged,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};
