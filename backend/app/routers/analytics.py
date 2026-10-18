from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from app.database import get_db
from app.models import Patient, Observation, TwinStateVersion, User
from app.schemas import AnalyticsSummaryResponse, LongitudinalDataPoint, PredictionPoint
from app.services.auth_service import get_current_user
from app.services.math_engine import compute_linear_baseline_prediction, to_utc_datetime
from app.services.alert_engine import get_current_thresholds

router = APIRouter(prefix="/analytics", tags=["Analytics & Baseline Prediction"])


@router.get("/patient/{patient_id}", response_model=AnalyticsSummaryResponse)
def get_patient_analytics(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access their own analytics.",
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    observations = (
        db.query(Observation)
        .filter(Observation.patient_id == patient_id)
        .order_by(Observation.observed_at)
        .all()
    )

    thresholds = get_current_thresholds(db)
    tolerance = thresholds["tolerance_growth_mm"]

    series = []
    dates = []
    lengths = []

    if observations:
        t0 = to_utc_datetime(observations[0].observed_at)
        for obs in observations:
            elapsed_days = int((to_utc_datetime(obs.observed_at) - t0).total_seconds() / 86400.0)
            twin = (
                db.query(TwinStateVersion)
                .filter(TwinStateVersion.observation_id == obs.id)
                .first()
            )
            m = obs.measurements

            point = LongitudinalDataPoint(
                observation_id=obs.id,
                twin_version_id=twin.id if twin else 0,
                observed_at=obs.observed_at,
                elapsed_days=elapsed_days,
                length_mm=obs.length_mm,
                width_mm=obs.width_mm,
                depth_mm=obs.depth_mm,
                volume_mm3=m.volume_mm3 if m else None,
                growth_rate_mm_per_month=m.growth_rate_mm_per_month if m else None,
                confidence=obs.measurement_confidence,
                quality=obs.image_quality,
                provenance=obs.source,
                tolerance_threshold_mm=tolerance,
            )
            series.append(point)
            dates.append(obs.observed_at)
            lengths.append(obs.length_mm)

    # Experimental linear baseline prediction (>= 3 points)
    predictions_raw = compute_linear_baseline_prediction(dates, lengths, horizon_days_list=[30, 60, 90])
    predictions = [PredictionPoint(**p) for p in predictions_raw]

    return AnalyticsSummaryResponse(
        patient_id=patient.id,
        patient_name=patient.full_name,
        mrn=patient.mrn,
        total_observations=len(observations),
        configured_tolerance_mm=tolerance,
        series=series,
        predictions=predictions,
        disclaimer=(
            "Research prototype — not clinically validated — not a medical device. "
            "No diagnostic or malignancy prediction claims are made."
        ),
        experimental_model_notes=(
            "Baseline forecast is an experimental ordinary least squares linear regression over observed time, "
            "computed only when >= 3 longitudinal observations exist. Real clinical prognosis requires validated "
            "multi-center histopathological training data, clinical covariate modeling, and prospective trial validation."
        ),
    )
