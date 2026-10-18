from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Alert, User
from app.schemas import AlertResponse, AlertAcknowledgeRequest
from app.services.auth_service import get_current_user
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    patient_id: Optional[int] = Query(None),
    alert_type: Optional[str] = Query(None),
    is_acknowledged: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(Alert)

    if current_user and current_user.role == "PATIENT" and current_user.patient_id:
        query = query.filter(Alert.patient_id == current_user.patient_id)
    elif patient_id:
        query = query.filter(Alert.patient_id == patient_id)

    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)

    if is_acknowledged is not None:
        query = query.filter(Alert.is_acknowledged == is_acknowledged)

    return query.order_by(Alert.created_at.desc()).all()


@router.put("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.is_acknowledged = req.acknowledged
    alert.acknowledged_at = datetime.utcnow() if req.acknowledged else None
    alert.acknowledged_by_user_id = current_user.id if current_user else None

    db.commit()
    db.refresh(alert)

    record_audit_event(
        db=db,
        event_type="ALERT_ACKNOWLEDGED" if req.acknowledged else "ALERT_UNACKNOWLEDGED",
        entity_type="Alert",
        entity_id=alert.id,
        user_id=current_user.id if current_user else None,
        details={"alert_type": alert.alert_type},
    )
    db.commit()
    return alert
