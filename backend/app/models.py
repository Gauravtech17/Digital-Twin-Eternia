import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), default="CLINICIAN", nullable=False)  # CLINICIAN, PATIENT, ADMIN
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="associated_user", foreign_keys=[patient_id])


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(64), unique=True, index=True, nullable=False)  # e.g. "MRN-2026-081"
    full_name = Column(String(128), nullable=False)
    date_of_birth = Column(String(32), nullable=False)  # "YYYY-MM-DD"
    biological_sex = Column(String(16), default="Female", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    associated_user = relationship("User", back_populates="patient", foreign_keys=[User.patient_id], uselist=False)
    observations = relationship("Observation", back_populates="patient", cascade="all, delete-orphan", order_by="Observation.observed_at")
    twin_versions = relationship("TwinStateVersion", back_populates="patient", cascade="all, delete-orphan", order_by="TwinStateVersion.version_number")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan", order_by="Alert.created_at.desc()")
    reviews = relationship("ReviewRecord", back_populates="patient", cascade="all, delete-orphan")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    observed_at = Column(DateTime, nullable=False, index=True)
    source = Column(String(32), default="MANUAL", nullable=False)  # MANUAL, UPLOAD, SIMULATED_STREAM
    
    # Measured dimensions in millimeters
    length_mm = Column(Float, nullable=False)
    width_mm = Column(Float, nullable=False)
    depth_mm = Column(Float, nullable=True)  # nullable per specification
    
    # Quality & Confidence indices (0.0 to 1.0)
    measurement_confidence = Column(Float, default=0.85, nullable=False)
    image_quality = Column(Float, default=0.80, nullable=False)
    
    notes = Column(Text, nullable=True)
    provenance_json = Column(Text, nullable=False)  # JSON dictionary mapping field to provenance tag
    created_at = Column(DateTime, default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="observations")
    measurements = relationship("LesionMeasurement", back_populates="observation", cascade="all, delete-orphan", uselist=False)
    imaging_assets = relationship("ImagingAsset", back_populates="observation", cascade="all, delete-orphan")
    twin_state_version = relationship("TwinStateVersion", back_populates="observation", uselist=False)


class LesionMeasurement(Base):
    __tablename__ = "lesion_measurements"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, unique=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    length_mm = Column(Float, nullable=False)
    width_mm = Column(Float, nullable=False)
    depth_mm = Column(Float, nullable=True)
    depth_assumed = Column(Boolean, default=False, nullable=False)
    
    volume_mm3 = Column(Float, nullable=True)  # Ellipsoid volume: (pi/6)*L*W*D
    volume_formula = Column(String(128), default="(pi/6)*L*W*D", nullable=False)
    volume_assumption = Column(String(128), default="None", nullable=False)
    
    # Growth rate relative to previous observation
    growth_rate_mm_per_month = Column(Float, nullable=True)  # mm/month
    growth_rate_interval_days = Column(Integer, nullable=True)
    
    provenance = Column(String(32), default="DERIVED", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    observation = relationship("Observation", back_populates="measurements")


class ImagingAsset(Base):
    __tablename__ = "imaging_assets"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("observations.id", ondelete="CASCADE"), nullable=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_path = Column(String(256), nullable=False)
    file_name = Column(String(128), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(64), nullable=False)
    width_px = Column(Integer, nullable=False)
    height_px = Column(Integer, nullable=False)
    
    # Spatial calibration: physical mm per pixel
    mm_per_pixel = Column(Float, nullable=True)
    is_calibrated = Column(Boolean, default=False, nullable=False)
    quality_score = Column(Float, default=0.85, nullable=False)
    
    # Synthetic scan indicator
    is_synthetic = Column(Boolean, default=True, nullable=False)
    watermark_applied = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    observation = relationship("Observation", back_populates="imaging_assets")
    annotations = relationship("Annotation", back_populates="imaging_asset", cascade="all, delete-orphan")


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    imaging_asset_id = Column(Integer, ForeignKey("imaging_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    shape_type = Column(String(32), nullable=False)  # ELLIPSE, POLYGON, LINE
    coordinates_json = Column(Text, nullable=False)  # Normalized (0.0 to 1.0) coordinates
    measurement_value = Column(Float, nullable=True)
    measurement_unit = Column(String(32), default="px, uncalibrated", nullable=False)
    label = Column(String(64), default="Lesion Boundary", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    imaging_asset = relationship("ImagingAsset", back_populates="annotations")


class TwinStateVersion(Base):
    __tablename__ = "twin_state_versions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    parent_version_id = Column(Integer, ForeignKey("twin_state_versions.id"), nullable=True)
    observation_id = Column(Integer, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Lesion dimensions at this state
    lesion_length_mm = Column(Float, nullable=False)
    lesion_width_mm = Column(Float, nullable=False)
    lesion_depth_mm = Column(Float, nullable=True)
    lesion_volume_mm3 = Column(Float, nullable=True)
    
    # Deltas compared to previous version
    delta_longest_dimension_mm = Column(Float, default=0.0, nullable=False)
    delta_volume_mm3 = Column(Float, nullable=True)
    elapsed_days_since_previous = Column(Integer, nullable=True)
    growth_rate_mm_per_month = Column(Float, nullable=True)
    
    # Procedural illustrative lesion positioning inside uterine cavity
    placement_x = Column(Float, default=0.2, nullable=False)
    placement_y = Column(Float, default=0.4, nullable=False)
    placement_z = Column(Float, default=0.0, nullable=False)
    illustrative_flag = Column(Boolean, default=True, nullable=False)  # Always True
    
    state_timestamp = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="twin_versions")
    observation = relationship("Observation", back_populates="twin_state_version")
    predictions = relationship("Prediction", back_populates="based_on_version")

    __table_args__ = (
        UniqueConstraint("patient_id", "version_number", name="uq_patient_twin_version"),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    based_on_version_id = Column(Integer, ForeignKey("twin_state_versions.id", ondelete="CASCADE"), nullable=False)
    
    method = Column(String(64), default="LINEAR_TREND_BASELINE", nullable=False)
    horizon_days = Column(Integer, nullable=False)  # 30, 60, 90
    predicted_longest_dimension_mm = Column(Float, nullable=False)
    lower_bound_mm = Column(Float, nullable=False)
    upper_bound_mm = Column(Float, nullable=False)
    
    formula_description = Column(String(256), nullable=False)
    assumptions_text = Column(Text, nullable=False)
    provenance = Column(String(32), default="PREDICTED_EXPERIMENTAL", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    based_on_version = relationship("TwinStateVersion", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_id = Column(Integer, ForeignKey("observations.id", ondelete="SET NULL"), nullable=True)
    twin_version_id = Column(Integer, ForeignKey("twin_state_versions.id", ondelete="SET NULL"), nullable=True)
    
    # NEW_OBSERVATION_RECEIVED, CHANGE_EXCEEDS_TOLERANCE, DATA_QUALITY_WARNING, AWAITING_CLINICIAN_REVIEW, PROCESSING_FAILURE
    alert_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), default="INFO", nullable=False)  # INFO, WARNING, ATTENTION
    title = Column(String(128), nullable=False)
    explanation = Column(Text, nullable=False)
    trigger_rule = Column(String(128), nullable=False)
    
    is_acknowledged = Column(Boolean, default=False, nullable=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    simulated_notification_status = Column(String(64), default="DELIVERED_SIMULATED", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="alerts")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    twin_version_id = Column(Integer, ForeignKey("twin_state_versions.id", ondelete="SET NULL"), nullable=True)
    observation_id = Column(Integer, ForeignKey("observations.id", ondelete="SET NULL"), nullable=True)
    clinician_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, IN_REVIEW, REVIEWED
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="reviews")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=True)
    # Stored details MUST NOT include patient identifying names or private identifiers
    details_json = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)


class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(128), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    raw_payload_json = Column(Text, nullable=False)
    status = Column(String(32), default="PROCESSED", nullable=False)  # PROCESSED, DUPLICATE_IGNORED
    processed_at = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, index=True, nullable=False)
    value_json = Column(Text, nullable=False)
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
