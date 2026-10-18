from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator


# Enums for data semantics and strict claims compliance
class ProvenanceType(str, Enum):
    MANUAL = "MANUAL"
    MEASURED = "MEASURED"
    DERIVED = "DERIVED"
    SIMULATED = "SIMULATED"
    PREDICTED = "PREDICTED"


class DataClass(str, Enum):
    OBSERVED = "OBSERVED"
    DERIVED = "DERIVED"
    ILLUSTRATIVE = "ILLUSTRATIVE"
    PREDICTION = "PREDICTION"


class ObservationSource(str, Enum):
    MANUAL = "MANUAL"
    UPLOAD = "UPLOAD"
    SIMULATED_STREAM = "SIMULATED_STREAM"


class UserRole(str, Enum):
    CLINICIAN = "CLINICIAN"
    PATIENT = "PATIENT"
    ADMIN = "ADMIN"


class ReviewStatus(str, Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    REVIEWED = "REVIEWED"


class AlertType(str, Enum):
    NEW_OBSERVATION_RECEIVED = "NEW_OBSERVATION_RECEIVED"
    CHANGE_EXCEEDS_TOLERANCE = "CHANGE_EXCEEDS_TOLERANCE"
    DATA_QUALITY_WARNING = "DATA_QUALITY_WARNING"
    AWAITING_CLINICIAN_REVIEW = "AWAITING_CLINICIAN_REVIEW"
    PROCESSING_FAILURE = "PROCESSING_FAILURE"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ATTENTION = "ATTENTION"


# User & Auth Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: str = Field(..., max_length=128)
    full_name: str = Field(..., min_length=2, max_length=128)
    role: UserRole = UserRole.CLINICIAN
    patient_id: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    demo_notice: str = "Demo-only access token — not production-grade clinical security."


class LoginRequest(BaseModel):
    username: str
    password: str


# Patient Schemas
class PatientBase(BaseModel):
    mrn: str = Field(..., min_length=3, max_length=64, description="Medical Record Number")
    full_name: str = Field(..., min_length=2, max_length=128)
    date_of_birth: str = Field(..., description="Format YYYY-MM-DD")
    biological_sex: str = Field(default="Female", max_length=16)
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    biological_sex: Optional[str] = None
    notes: Optional[str] = None


class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    observation_count: int = 0
    latest_observation_date: Optional[datetime] = None
    latest_review_status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# Observation Schemas
class ObservationCreate(BaseModel):
    patient_id: int
    observed_at: datetime
    source: ObservationSource = ObservationSource.MANUAL
    
    length_mm: float = Field(..., gt=0.0, description="Longest lesion dimension in mm")
    width_mm: float = Field(..., gt=0.0, description="Lesion width in mm")
    depth_mm: Optional[float] = Field(None, gt=0.0, description="Lesion depth in mm (nullable)")
    
    # Optional selection if depth is missing
    missing_depth_assumption: Optional[str] = Field(
        None, 
        description="Explicit assumption if depth is omitted, e.g., 'ASSUME_DEPTH_EQUALS_WIDTH'"
    )
    
    measurement_confidence: float = Field(0.85, ge=0.0, le=1.0)
    image_quality: float = Field(0.80, ge=0.0, le=1.0)
    notes: Optional[str] = None
    provenance_tag: ProvenanceType = ProvenanceType.MANUAL


class LesionMeasurementResponse(BaseModel):
    id: int
    observation_id: int
    patient_id: int
    length_mm: float
    width_mm: float
    depth_mm: Optional[float]
    depth_assumed: bool
    volume_mm3: Optional[float]
    volume_formula: str
    volume_assumption: str
    growth_rate_mm_per_month: Optional[float]
    growth_rate_interval_days: Optional[int]
    provenance: str
    model_config = ConfigDict(from_attributes=True)


class ObservationResponse(BaseModel):
    id: int
    patient_id: int
    observed_at: datetime
    source: ObservationSource
    length_mm: float
    width_mm: float
    depth_mm: Optional[float]
    measurement_confidence: float
    image_quality: float
    notes: Optional[str]
    provenance_json: str
    created_at: datetime
    measurements: Optional[LesionMeasurementResponse] = None
    model_config = ConfigDict(from_attributes=True)


# Twin State Schemas
class TwinStateVersionResponse(BaseModel):
    id: int
    patient_id: int
    version_number: int
    parent_version_id: Optional[int]
    observation_id: int
    
    lesion_length_mm: float
    lesion_width_mm: float
    lesion_depth_mm: Optional[float]
    lesion_volume_mm3: Optional[float]
    
    delta_longest_dimension_mm: float
    delta_volume_mm3: Optional[float]
    elapsed_days_since_previous: Optional[int]
    growth_rate_mm_per_month: Optional[float]
    
    placement_x: float
    placement_y: float
    placement_z: float
    illustrative_flag: bool = True
    disclaimer: str = "Illustrative anatomy — not a patient-specific reconstruction."
    
    state_timestamp: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Alert Schemas
class AlertResponse(BaseModel):
    id: int
    patient_id: int
    observation_id: Optional[int]
    twin_version_id: Optional[int]
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    explanation: str
    trigger_rule: str
    is_acknowledged: bool
    acknowledged_at: Optional[datetime]
    simulated_notification_status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    acknowledged: bool = True


# Clinical Review Schemas
class ReviewRecordCreate(BaseModel):
    patient_id: int
    observation_id: Optional[int] = None
    twin_version_id: Optional[int] = None
    status: ReviewStatus = ReviewStatus.REVIEWED
    review_notes: str = Field(..., min_length=2)


class ReviewRecordResponse(BaseModel):
    id: int
    patient_id: int
    observation_id: Optional[int]
    twin_version_id: Optional[int]
    clinician_id: Optional[int]
    status: ReviewStatus
    review_notes: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Simulation Ingestion Schema
class SimulationIngestRequest(BaseModel):
    idempotency_key: str = Field(..., min_length=4, max_length=128)
    patient_id: int
    observed_at: datetime
    source: ObservationSource = ObservationSource.SIMULATED_STREAM
    
    length_mm: float = Field(..., gt=0.0)
    width_mm: float = Field(..., gt=0.0)
    depth_mm: Optional[float] = Field(None, gt=0.0)
    missing_depth_assumption: Optional[str] = "ASSUME_DEPTH_EQUALS_WIDTH"
    
    measurement_confidence: float = Field(0.88, ge=0.0, le=1.0)
    image_quality: float = Field(0.85, ge=0.0, le=1.0)
    notes: Optional[str] = "Simulated stream event from proposed wearable ultrasound concept"


class SimulationIngestResponse(BaseModel):
    status: str  # "PROCESSED" or "DUPLICATE_IDEMPOTENT_IGNORED"
    idempotency_key: str
    patient_id: int
    observation: ObservationResponse
    twin_version: TwinStateVersionResponse
    alerts_generated: List[AlertResponse]
    audit_event_id: int
    research_notice: str = "Research prototype — not clinically validated."


# Analytics & Experimental Prediction Schemas
class LongitudinalDataPoint(BaseModel):
    observation_id: int
    twin_version_id: int
    observed_at: datetime
    elapsed_days: int
    length_mm: float
    width_mm: float
    depth_mm: Optional[float]
    volume_mm3: Optional[float]
    growth_rate_mm_per_month: Optional[float]
    confidence: float
    quality: float
    provenance: str
    tolerance_threshold_mm: float


class PredictionPoint(BaseModel):
    horizon_days: int
    projected_date: datetime
    predicted_longest_dimension_mm: float
    lower_bound_mm: float
    upper_bound_mm: float
    model_type: str = "LINEAR_TREND_BASELINE"
    provenance: str = "PREDICTED_EXPERIMENTAL"


class AnalyticsSummaryResponse(BaseModel):
    patient_id: int
    patient_name: str
    mrn: str
    total_observations: int
    configured_tolerance_mm: float
    series: List[LongitudinalDataPoint]
    predictions: List[PredictionPoint]
    disclaimer: str
    experimental_model_notes: str


# Imaging & Annotation Schemas
class ImagingAssetResponse(BaseModel):
    id: int
    observation_id: Optional[int]
    patient_id: int
    file_name: str
    file_size_bytes: int
    mime_type: str
    width_px: int
    height_px: int
    mm_per_pixel: Optional[float]
    is_calibrated: bool
    quality_score: float
    is_synthetic: bool
    watermark_applied: bool
    created_at: datetime
    image_url: str
    model_config = ConfigDict(from_attributes=True)


class AnnotationCreate(BaseModel):
    imaging_asset_id: int
    shape_type: str = Field(..., description="ELLIPSE, POLYGON, LINE")
    coordinates_json: str = Field(..., description="Normalized 0.0 to 1.0 JSON coordinates")
    measurement_value: Optional[float] = None
    measurement_unit: str = "px, uncalibrated"
    label: str = "Lesion Boundary"
    notes: Optional[str] = None


class AnnotationResponse(BaseModel):
    id: int
    imaging_asset_id: int
    created_by_user_id: Optional[int]
    shape_type: str
    coordinates_json: str
    measurement_value: Optional[float]
    measurement_unit: str
    label: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Settings Schemas
class SystemSettingsUpdate(BaseModel):
    tolerance_growth_mm: float = Field(..., gt=0.0)
    low_confidence_threshold: float = Field(..., ge=0.0, le=1.0)
    low_quality_threshold: float = Field(..., ge=0.0, le=1.0)
    missing_depth_strategy: str = "ASSUME_WIDTH"


class SystemSettingsResponse(BaseModel):
    tolerance_growth_mm: float
    low_confidence_threshold: float
    low_quality_threshold: float
    missing_depth_strategy: str
    demonstration_notice: str = "Demonstration alert threshold values — not clinical guidelines."
