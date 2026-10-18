import {
  Patient,
  Observation,
  TwinStateVersion,
  ImagingAsset,
  Annotation,
  Alert,
  ReviewRecord,
  AnalyticsSummary,
  SystemSettings,
  SimulationIngestResponse,
  User,
} from './types';

const API_BASE = '/api/v1';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('polypulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch (e) {
      errorDetail = res.statusText;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Health
  getHealth: () => fetchJSON<{ status: string; service: string; disclaimer: string }>(`${API_BASE}/health`),

  // Auth & Demo Users
  getDemoUsers: () => fetchJSON<User[]>(`${API_BASE}/auth/demo-users`),
  getCurrentUser: () => fetchJSON<User>(`${API_BASE}/auth/me`),
  loginDemo: (username: string) =>
    fetchJSON<{ access_token: string; user: User }>(`${API_BASE}/auth/token`, {
      method: 'POST',
      body: JSON.stringify({ username, password: 'password123' }),
    }),

  // Patients
  getPatients: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJSON<Patient[]>(`${API_BASE}/patients${q}`);
  },
  getPatient: (id: number) => fetchJSON<Patient>(`${API_BASE}/patients/${id}`),
  createPatient: (data: Partial<Patient>) =>
    fetchJSON<Patient>(`${API_BASE}/patients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePatient: (id: number, data: Partial<Patient>) =>
    fetchJSON<Patient>(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Observations
  getObservations: (patientId?: number, source?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (source) params.append('source', source);
    return fetchJSON<Observation[]>(`${API_BASE}/observations?${params.toString()}`);
  },
  getObservation: (id: number) => fetchJSON<Observation>(`${API_BASE}/observations/${id}`),
  createObservation: (data: any) =>
    fetchJSON<Observation>(`${API_BASE}/observations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  compareObservations: (obs1Id: number, obs2Id: number) =>
    fetchJSON<any>(`${API_BASE}/observations/compare/${obs1Id}/${obs2Id}`),

  // Twin State
  getCurrentTwinState: (patientId: number) =>
    fetchJSON<TwinStateVersion>(`${API_BASE}/twin/patient/${patientId}/current`),
  getTwinVersions: (patientId: number) =>
    fetchJSON<TwinStateVersion[]>(`${API_BASE}/twin/patient/${patientId}/versions`),
  getTwinVersion: (versionId: number) =>
    fetchJSON<TwinStateVersion>(`${API_BASE}/twin/version/${versionId}`),

  // Imaging
  getPatientImagingAssets: (patientId: number) =>
    fetchJSON<ImagingAsset[]>(`${API_BASE}/imaging/patient/${patientId}`),
  uploadImagingAsset: async (formData: FormData): Promise<ImagingAsset> => {
    const token = localStorage.getItem('polypulse_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/imaging/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  getAssetAnnotations: (assetId: number) =>
    fetchJSON<Annotation[]>(`${API_BASE}/imaging/asset/${assetId}/annotations`),
  createAnnotation: (data: Partial<Annotation>) =>
    fetchJSON<Annotation>(`${API_BASE}/imaging/annotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAnnotation: (annotationId: number) =>
    fetch(`${API_BASE}/imaging/annotations/${annotationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: localStorage.getItem('polypulse_token') ? `Bearer ${localStorage.getItem('polypulse_token')}` : '',
      },
    }),

  // Analytics
  getAnalytics: (patientId: number) =>
    fetchJSON<AnalyticsSummary>(`${API_BASE}/analytics/patient/${patientId}`),

  // Alerts
  getAlerts: (patientId?: number, alertType?: string, acknowledged?: boolean) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (alertType) params.append('alert_type', alertType);
    if (acknowledged !== undefined) params.append('is_acknowledged', String(acknowledged));
    return fetchJSON<Alert[]>(`${API_BASE}/alerts?${params.toString()}`);
  },
  acknowledgeAlert: (alertId: number, acknowledged: boolean = true) =>
    fetchJSON<Alert>(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify({ acknowledged }),
    }),

  // Clinical Reviews & Audits
  getReviews: (patientId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (status) params.append('status', status);
    return fetchJSON<ReviewRecord[]>(`${API_BASE}/reviews?${params.toString()}`);
  },
  submitReview: (data: { patient_id: number; status: string; review_notes: string; observation_id?: number }) =>
    fetchJSON<ReviewRecord>(`${API_BASE}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAuditTrail: (patientId: number) =>
    fetchJSON<any[]>(`${API_BASE}/reviews/audit/${patientId}`),

  // Settings
  getSettings: () => fetchJSON<SystemSettings>(`${API_BASE}/settings`),
  updateSettings: (data: Partial<SystemSettings>) =>
    fetchJSON<SystemSettings>(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Simulation Console
  ingestSimulation: (payload: any) =>
    fetchJSON<SimulationIngestResponse>(`${API_BASE}/simulation/ingest`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getPdfReportUrl: (patientId: number) => `${API_BASE}/reports/patient/${patientId}/pdf`,
  getHtmlReportUrl: (patientId: number) => `${API_BASE}/reports/patient/${patientId}/html`,
};
