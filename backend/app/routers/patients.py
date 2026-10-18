from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models import Patient, Observation, ReviewRecord, User
from app.schemas import PatientCreate, PatientUpdate, PatientResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
def list_patients(
    search: Optional[str] = Query(None, description="Search by MRN or Name"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(Patient)

    # Patient users can only view their own record
    if current_user and current_user.role == "PATIENT" and current_user.patient_id:
        query = query.filter(Patient.id == current_user.patient_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Patient.mrn.ilike(search_filter)) | (Patient.full_name.ilike(search_filter))
        )

    patients = query.order_by(Patient.id).all()
    results = []
    for p in patients:
        obs_count = db.query(Observation).filter(Observation.patient_id == p.id).count()
        latest_obs = (
            db.query(Observation)
            .filter(Observation.patient_id == p.id)
            .order_by(desc(Observation.observed_at))
            .first()
        )
        latest_rev = (
            db.query(ReviewRecord)
            .filter(ReviewRecord.patient_id == p.id)
            .order_by(desc(ReviewRecord.created_at))
            .first()
        )

        resp = PatientResponse(
            id=p.id,
            mrn=p.mrn,
            full_name=p.full_name,
            date_of_birth=p.date_of_birth,
            biological_sex=p.biological_sex,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
            observation_count=obs_count,
            latest_observation_date=latest_obs.observed_at if latest_obs else None,
            latest_review_status=latest_rev.status if latest_rev else "PENDING",
        )
        results.append(resp)

    return results


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    existing = db.query(Patient).filter(Patient.mrn == patient_in.mrn).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with MRN '{patient_in.mrn}' already exists.",
        )

    patient = Patient(
        mrn=patient_in.mrn,
        full_name=patient_in.full_name,
        date_of_birth=patient_in.date_of_birth,
        biological_sex=patient_in.biological_sex,
        notes=patient_in.notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    record_audit_event(
        db=db,
        event_type="PATIENT_CREATED",
        entity_type="Patient",
        entity_id=patient.id,
        user_id=current_user.id if current_user else None,
        details={"mrn": patient.mrn},
    )
    db.commit()

    return PatientResponse(
        id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        date_of_birth=patient.date_of_birth,
        biological_sex=patient.biological_sex,
        notes=patient.notes,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        observation_count=0,
        latest_observation_date=None,
        latest_review_status="PENDING",
    )


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only access their own clinical record.",
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found.",
        )

    obs_count = db.query(Observation).filter(Observation.patient_id == patient.id).count()
    latest_obs = (
        db.query(Observation)
        .filter(Observation.patient_id == patient.id)
        .order_by(desc(Observation.observed_at))
        .first()
    )
    latest_rev = (
        db.query(ReviewRecord)
        .filter(ReviewRecord.patient_id == patient.id)
        .order_by(desc(ReviewRecord.created_at))
        .first()
    )

    return PatientResponse(
        id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        date_of_birth=patient.date_of_birth,
        biological_sex=patient.biological_sex,
        notes=patient.notes,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        observation_count=obs_count,
        latest_observation_date=latest_obs.observed_at if latest_obs else None,
        latest_review_status=latest_rev.status if latest_rev else "PENDING",
    )


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found.",
        )

    if patient_in.full_name is not None:
        patient.full_name = patient_in.full_name
    if patient_in.date_of_birth is not None:
        patient.date_of_birth = patient_in.date_of_birth
    if patient_in.biological_sex is not None:
        patient.biological_sex = patient_in.biological_sex
    if patient_in.notes is not None:
        patient.notes = patient_in.notes

    db.commit()
    db.refresh(patient)

    return get_patient(patient_id=patient_id, db=db, current_user=current_user)
