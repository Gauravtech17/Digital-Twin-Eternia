from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import ReviewRecord, AuditEvent, Patient, User
from app.schemas import ReviewRecordCreate, ReviewRecordResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/reviews", tags=["Clinical Review & Audit Trail"])


@router.get("", response_model=List[ReviewRecordResponse])
def list_reviews(
    patient_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(ReviewRecord)

    if current_user and current_user.role == "PATIENT" and current_user.patient_id:
        query = query.filter(ReviewRecord.patient_id == current_user.patient_id)
    elif patient_id:
        query = query.filter(ReviewRecord.patient_id == patient_id)

    if status_filter:
        query = query.filter(ReviewRecord.status == status_filter)

    return query.order_by(desc(ReviewRecord.created_at)).all()


@router.post("", response_model=ReviewRecordResponse, status_code=status.HTTP_201_CREATED)
def submit_review(
    review_in: ReviewRecordCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == review_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    record = ReviewRecord(
        patient_id=review_in.patient_id,
        observation_id=review_in.observation_id,
        twin_version_id=review_in.twin_version_id,
        clinician_id=current_user.id if current_user else None,
        status=review_in.status.value,
        review_notes=review_in.review_notes,
        reviewed_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    record_audit_event(
        db=db,
        event_type="CLINICAL_REVIEW_SUBMITTED",
        entity_type="ReviewRecord",
        entity_id=record.id,
        user_id=current_user.id if current_user else None,
        details={"status": record.status},
    )
    db.commit()
    return record


@router.get("/audit/{patient_id}")
def get_patient_audit_trail(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Returns chronological audit events pertaining to this patient's records."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    events = db.query(AuditEvent).order_by(desc(AuditEvent.timestamp)).limit(100).all()
    # Stored details contain no PHI
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "user_id": e.user_id,
            "details": e.details_json,
            "timestamp": e.timestamp.isoformat(),
        }
        for e in events
    ]
