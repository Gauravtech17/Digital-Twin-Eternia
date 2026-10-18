export type ProvenanceType = 'MANUAL' | 'MEASURED' | 'DERIVED' | 'SIMULATED' | 'PREDICTED';
export type DataClass = 'OBSERVED' | 'DERIVED' | 'ILLUSTRATIVE' | 'PREDICTION';
export type ObservationSource = 'MANUAL' | 'UPLOAD' | 'SIMULATED_STREAM';
export type UserRole = 'CLINICIAN' | 'PATIENT' | 'ADMIN';
export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'REVIEWED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'ATTENTION';
export type AlertType =
  | 'NEW_OBSERVATION_RECEIVED'
  | 'CHANGE_EXCEEDS_TOLERANCE'
  | 'DATA_QUALITY_WARNING'
  | 'AWAITING_CLINICIAN_REVIEW'
  | 'PROCESSING_FAILURE';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  patient_id?: number | null;
  created_at: string;
}

export interface Patient {
  id: number;
  mrn: string;
  full_name: string;
  date_of_birth: string;
  biological_sex: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  observation_count: number;
  latest_observation_date?: string | null;
  latest_review_status?: ReviewStatus | string;
}

export interface LesionMeasurement {
  id: number;
  observation_id: number;
  patient_id: number;
  length_mm: float_number;
  width_mm: float_number;
  depth_mm?: float_number | null;
  depth_assumed: boolean;
  volume_mm3?: float_number | null;
  volume_formula: string;
  volume_assumption: string;
  growth_rate_mm_per_month?: float_number | null;
  growth_rate_interval_days?: number | null;
  provenance: string;
}

type float_number = number;

export interface Observation {
  id: number;
  patient_id: number;
  observed_at: string;
  source: ObservationSource;
  length_mm: number;
  width_mm: number;
  depth_mm?: number | null;
  measurement_confidence: number;
  image_quality: number;
  notes?: string | null;
  provenance_json: string;
  created_at: string;
  measurements?: LesionMeasurement | null;
}

export interface TwinStateVersion {
  id: number;
  patient_id: number;
  version_number: number;
  parent_version_id?: number | null;
  observation_id: number;
  lesion_length_mm: number;
  lesion_width_mm: number;
  lesion_depth_mm?: number | null;
  lesion_volume_mm3?: number | null;
  delta_longest_dimension_mm: number;
  delta_volume_mm3?: number | null;
  elapsed_days_since_previous?: number | null;
  growth_rate_mm_per_month?: number | null;
  placement_x: number;
  placement_y: number;
  placement_z: number;
  illustrative_flag: boolean;
  disclaimer: string;
  state_timestamp: string;
  created_at: string;
}

export interface ImagingAsset {
  id: number;
  observation_id?: number | null;
  patient_id: number;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  width_px: number;
  height_px: number;
  mm_per_pixel?: number | null;
  is_calibrated: boolean;
  quality_score: number;
  is_synthetic: boolean;
  watermark_applied: boolean;
  created_at: string;
  image_url: string;
}

export interface Annotation {
  id: number;
  imaging_asset_id: number;
  created_by_user_id?: number | null;
  shape_type: 'ELLIPSE' | 'POLYGON' | 'LINE';
  coordinates_json: string;
  measurement_value?: number | null;
  measurement_unit: string;
  label: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  patient_id: number;
  observation_id?: number | null;
  twin_version_id?: number | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  explanation: string;
  trigger_rule: string;
  is_acknowledged: boolean;
  acknowledged_at?: string | null;
  simulated_notification_status: string;
  created_at: string;
}

export interface ReviewRecord {
  id: number;
  patient_id: number;
  observation_id?: number | null;
  twin_version_id?: number | null;
  clinician_id?: number | null;
  status: ReviewStatus;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LongitudinalDataPoint {
  observation_id: number;
  twin_version_id: number;
  observed_at: string;
  elapsed_days: number;
  length_mm: number;
  width_mm: number;
  depth_mm?: number | null;
  volume_mm3?: number | null;
  growth_rate_mm_per_month?: number | null;
  confidence: number;
  quality: number;
  provenance: string;
  tolerance_threshold_mm: number;
}

export interface PredictionPoint {
  horizon_days: number;
  projected_date: string;
  predicted_longest_dimension_mm: number;
  lower_bound_mm: number;
  upper_bound_mm: number;
  model_type: string;
  provenance: string;
}

export interface AnalyticsSummary {
  patient_id: number;
  patient_name: string;
  mrn: string;
  total_observations: number;
  configured_tolerance_mm: number;
  series: LongitudinalDataPoint[];
  predictions: PredictionPoint[];
  disclaimer: string;
  experimental_model_notes: string;
}

export interface SystemSettings {
  tolerance_growth_mm: number;
  low_confidence_threshold: number;
  low_quality_threshold: number;
  missing_depth_strategy: string;
  demonstration_notice: string;
}

export interface SimulationIngestResponse {
  status: string;
  idempotency_key: string;
  patient_id: number;
  observation: Observation;
  twin_version: TwinStateVersion;
  alerts_generated: Alert[];
  audit_event_id: number;
  research_notice: string;
}
