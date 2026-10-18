from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models import Observation, Patient, User
from app.schemas import ObservationCreate, ObservationResponse
from app.services.auth_service import get_current_user
from app.services.twin_engine import process_new_observation
from app.services.math_engine import compute_growth_rate, to_utc_datetime

router = APIRouter(prefix="/observations", tags=["Observations"])


@router.post("", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
def create_observation(
    obs_in: ObservationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    try:
        observation, twin_version, alerts = process_new_observation(
            db=db,
            obs_data=obs_in,
            user_id=current_user.id if current_user else None,
        )
        db.commit()
        db.refresh(observation)
        return observation
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process observation pipeline: {str(e)}",
        )


@router.get("", response_model=List[ObservationResponse])
def list_observations(
    patient_id: Optional[int] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(Observation)

    if current_user and current_user.role == "PATIENT" and current_user.patient_id:
        query = query.filter(Observation.patient_id == current_user.patient_id)
    elif patient_id:
        query = query.filter(Observation.patient_id == patient_id)

    if source:
        query = query.filter(Observation.source == source)

    observations = query.order_by(Observation.observed_at).all()
    return observations


@router.get("/{observation_id}", response_model=ObservationResponse)
def get_observation(
    observation_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found.",
        )

    if current_user and current_user.role == "PATIENT" and current_user.patient_id != obs.patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access observations from their own record.",
        )

    return obs


@router.get("/compare/{obs1_id}/{obs2_id}")
def compare_observations(
    obs1_id: int,
    obs2_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Computes rigorous side-by-side comparative analysis between two observations.
    All deltas and rates are computed strictly from stored data.
    """
    obs1 = db.query(Observation).filter(Observation.id == obs1_id).first()
    obs2 = db.query(Observation).filter(Observation.id == obs2_id).first()

    if not obs1 or not obs2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both observation records could not be found.",
        )

    if obs1.patient_id != obs2.patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot compare observations from two different patients.",
        )

    # Order chronologically (earlier vs later)
    earlier, later = (
        (obs1, obs2)
        if to_utc_datetime(obs1.observed_at) <= to_utc_datetime(obs2.observed_at)
        else (obs2, obs1)
    )

    growth_rate, elapsed_days = compute_growth_rate(
        current_longest_mm=later.length_mm,
        previous_longest_mm=earlier.length_mm,
        current_date=later.observed_at,
        previous_date=earlier.observed_at,
    )

    delta_length = round(later.length_mm - earlier.length_mm, 2)
    delta_width = round(later.width_mm - earlier.width_mm, 2)

    delta_volume = None
    if earlier.measurements and earlier.measurements.volume_mm3 and later.measurements and later.measurements.volume_mm3:
        delta_volume = round(later.measurements.volume_mm3 - earlier.measurements.volume_mm3, 2)

    return {
        "patient_id": earlier.patient_id,
        "earlier_observation": {
            "id": earlier.id,
            "date": earlier.observed_at,
            "source": earlier.source,
            "length_mm": earlier.length_mm,
            "width_mm": earlier.width_mm,
            "depth_mm": earlier.depth_mm,
            "volume_mm3": earlier.measurements.volume_mm3 if earlier.measurements else None,
            "confidence": earlier.measurement_confidence,
            "quality": earlier.image_quality,
        },
        "later_observation": {
            "id": later.id,
            "date": later.observed_at,
            "source": later.source,
            "length_mm": later.length_mm,
            "width_mm": later.width_mm,
            "depth_mm": later.depth_mm,
            "volume_mm3": later.measurements.volume_mm3 if later.measurements else None,
            "confidence": later.measurement_confidence,
            "quality": later.image_quality,
        },
        "comparison": {
            "elapsed_days": elapsed_days,
            "delta_length_mm": delta_length,
            "delta_width_mm": delta_width,
            "delta_volume_mm3": delta_volume,
            "growth_rate_mm_per_month": growth_rate,
            "formula_used": "Rate = (ΔLongest / elapsed_days) * 30.4375 mm/month",
            "provenance": "DERIVED",
        },
        "disclaimer": "Research prototype — not clinically validated.",
    }
