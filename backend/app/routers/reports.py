from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.models import Patient, User
from app.services.auth_service import get_current_user
from app.services.report_generator import generate_pdf_report, generate_html_report
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/reports", tags=["Reports Export"])


@router.get("/patient/{patient_id}/pdf")
def download_patient_pdf_report(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only download their own reports.",
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    pdf_bytes = generate_pdf_report(patient=patient, db=db)

    record_audit_event(
        db=db,
        event_type="PDF_REPORT_DOWNLOADED",
        entity_type="Patient",
        entity_id=patient.id,
        user_id=current_user.id if current_user else None,
        details={"format": "PDF"},
    )
    db.commit()

    filename = f"POLYPULSE_Report_{patient.mrn}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/patient/{patient_id}/html")
def download_patient_html_report(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if current_user and current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient users can only download their own reports.",
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    html_text = generate_html_report(patient=patient, db=db)

    record_audit_event(
        db=db,
        event_type="HTML_REPORT_DOWNLOADED",
        entity_type="Patient",
        entity_id=patient.id,
        user_id=current_user.id if current_user else None,
        details={"format": "HTML"},
    )
    db.commit()

    filename = f"POLYPULSE_Report_{patient.mrn}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.html"
    return Response(
        content=html_text,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
