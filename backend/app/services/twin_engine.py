import json
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import (
    Patient,
    Observation,
    LesionMeasurement,
    TwinStateVersion,
    ReviewRecord,
)
from app.schemas import ObservationCreate
from app.services.math_engine import compute_ellipsoid_volume, compute_growth_rate, to_utc_datetime
from app.services.alert_engine import evaluate_observation_alerts
from app.services.audit_service import record_audit_event


def process_new_observation(
    db: Session,
    obs_data: ObservationCreate,
    user_id: Optional[int] = None,
) -> Tuple[Observation, TwinStateVersion, List]:
    """
    Executes the atomic processing pipeline for a new serial observation:
    1. Validates patient existence.
    2. Retrieves previous observation for longitudinal comparison.
    3. Computes derived volume & growth rate using explicit formulas/assumptions.
    4. Creates immutable TwinStateVersion.
    5. Evaluates alert rules.
    6. Creates pending Clinical Review record.
    7. Records audit events.
    """
    patient = db.query(Patient).filter(Patient.id == obs_data.patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID {obs_data.patient_id} does not exist.")

    # Retrieve previous observation for this patient
    previous_obs = (
        db.query(Observation)
        .filter(Observation.patient_id == obs_data.patient_id)
        .order_by(desc(Observation.observed_at))
        .first()
    )

    # 1. Compute Volume & Assumption
    vol_mm3, vol_formula, vol_assumption, depth_assumed = compute_ellipsoid_volume(
        length_mm=obs_data.length_mm,
        width_mm=obs_data.width_mm,
        depth_mm=obs_data.depth_mm,
        missing_depth_assumption=obs_data.missing_depth_assumption,
    )

    # 2. Compute Growth Rate if >= 2 observations
    growth_rate_mm_month = None
    elapsed_days = None
    if previous_obs:
        growth_rate_mm_month, elapsed_days = compute_growth_rate(
            current_longest_mm=obs_data.length_mm,
            previous_longest_mm=previous_obs.length_mm,
            current_date=obs_data.observed_at,
            previous_date=previous_obs.observed_at,
        )

    # 3. Create Provenance dictionary
    provenance_map = {
        "length_mm": obs_data.provenance_tag.value,
        "width_mm": obs_data.provenance_tag.value,
        "depth_mm": obs_data.provenance_tag.value if obs_data.depth_mm else "ASSUMED" if depth_assumed else "NONE",
        "volume_mm3": "DERIVED" if vol_mm3 is not None else "NONE",
        "growth_rate": "DERIVED" if growth_rate_mm_month is not None else "NONE",
    }

    # 4. Save Observation
    observation = Observation(
        patient_id=obs_data.patient_id,
        observed_at=to_utc_datetime(obs_data.observed_at).replace(tzinfo=None),
        source=obs_data.source.value,
        length_mm=round(obs_data.length_mm, 2),
        width_mm=round(obs_data.width_mm, 2),
        depth_mm=round(obs_data.depth_mm, 2) if obs_data.depth_mm else None,
        measurement_confidence=obs_data.measurement_confidence,
        image_quality=obs_data.image_quality,
        notes=obs_data.notes,
        provenance_json=json.dumps(provenance_map),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(observation)
    db.flush()

    # 5. Save LesionMeasurement
    measurement = LesionMeasurement(
        observation_id=observation.id,
        patient_id=observation.patient_id,
        length_mm=observation.length_mm,
        width_mm=observation.width_mm,
        depth_mm=observation.depth_mm,
        depth_assumed=depth_assumed,
        volume_mm3=vol_mm3,
        volume_formula=vol_formula,
        volume_assumption=vol_assumption,
        growth_rate_mm_per_month=growth_rate_mm_month,
        growth_rate_interval_days=elapsed_days,
        provenance="DERIVED",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(measurement)
    db.flush()

    # 6. Retrieve latest twin version to compute version monotonic increment
    latest_version = (
        db.query(TwinStateVersion)
        .filter(TwinStateVersion.patient_id == obs_data.patient_id)
        .order_by(desc(TwinStateVersion.version_number))
        .first()
    )

    next_version_num = 1 if not latest_version else latest_version.version_number + 1
    parent_version_id = latest_version.id if latest_version else None

    # Compute deltas
    delta_longest = round(obs_data.length_mm - (previous_obs.length_mm if previous_obs else obs_data.length_mm), 2)
    delta_volume = None
    if previous_obs and previous_obs.measurements and previous_obs.measurements.volume_mm3 and vol_mm3:
        delta_volume = round(vol_mm3 - previous_obs.measurements.volume_mm3, 2)

    # Procedural illustrative coordinates for polyp attachment inside endometrial cavity (uterus.glb)
    placement_x = 0.12
    placement_y = 0.22
    placement_z = 0.0

    twin_version = TwinStateVersion(
        patient_id=obs_data.patient_id,
        version_number=next_version_num,
        parent_version_id=parent_version_id,
        observation_id=observation.id,
        lesion_length_mm=observation.length_mm,
        lesion_width_mm=observation.width_mm,
        lesion_depth_mm=observation.depth_mm or (observation.width_mm if depth_assumed else None),
        lesion_volume_mm3=vol_mm3,
        delta_longest_dimension_mm=delta_longest,
        delta_volume_mm3=delta_volume,
        elapsed_days_since_previous=elapsed_days,
        growth_rate_mm_per_month=growth_rate_mm_month,
        placement_x=placement_x,
        placement_y=placement_y,
        placement_z=placement_z,
        illustrative_flag=True,
        state_timestamp=to_utc_datetime(obs_data.observed_at).replace(tzinfo=None),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(twin_version)
    db.flush()

    # 7. Evaluate Alerts
    alerts = evaluate_observation_alerts(
        db=db,
        observation=observation,
        twin_version=twin_version,
        previous_observation=previous_obs,
    )

    # 8. Create or Update Clinical Review Record
    review_record = ReviewRecord(
        patient_id=obs_data.patient_id,
        twin_version_id=twin_version.id,
        observation_id=observation.id,
        status="PENDING",
        review_notes=None,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(review_record)
    db.flush()

    # 9. Write Audit Events
    record_audit_event(
        db=db,
        event_type="OBSERVATION_INGESTED",
        entity_type="Observation",
        entity_id=observation.id,
        user_id=user_id,
        details={
            "source": observation.source,
            "length_mm": observation.length_mm,
            "width_mm": observation.width_mm,
            "volume_computed": vol_mm3 is not None,
        },
    )

    record_audit_event(
        db=db,
        event_type="TWIN_VERSION_CREATED",
        entity_type="TwinStateVersion",
        entity_id=twin_version.id,
        user_id=user_id,
        details={
            "version_number": twin_version.version_number,
            "delta_longest_dimension_mm": delta_longest,
            "alerts_triggered": len(alerts),
        },
    )

    return observation, twin_version, alerts
