from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models import TwinStateVersion, Patient, User
from app.schemas import TwinStateVersionResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/twin", tags=["Digital Twin State"])


@router.get("/patient/{patient_id}/current", response_model=TwinStateVersionResponse)
def get_current_twin_state(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access their own digital twin state.",
        )

    twin = (
        db.query(TwinStateVersion)
        .filter(TwinStateVersion.patient_id == patient_id)
        .order_by(desc(TwinStateVersion.version_number))
        .first()
    )
    if not twin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No twin state found for patient {patient_id}. Ingest an observation first.",
        )
    return twin


@router.get("/patient/{patient_id}/versions", response_model=List[TwinStateVersionResponse])
def list_twin_versions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access their own digital twin timeline.",
        )

    versions = (
        db.query(TwinStateVersion)
        .filter(TwinStateVersion.patient_id == patient_id)
        .order_by(TwinStateVersion.version_number)
        .all()
    )
    return versions


@router.get("/version/{version_id}", response_model=TwinStateVersionResponse)
def get_twin_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    twin = db.query(TwinStateVersion).filter(TwinStateVersion.id == version_id).first()
    if not twin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Twin state version {version_id} not found.",
        )

    if current_user and current_user.role == "PATIENT" and current_user.patient_id != twin.patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access their own digital twin state.",
        )
    return twin
