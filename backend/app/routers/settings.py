from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models import SystemSetting, User
from app.schemas import SystemSettingsResponse, SystemSettingsUpdate
from app.services.auth_service import get_current_user
from app.services.alert_engine import get_current_thresholds
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/settings", tags=["Settings & Configuration"])


@router.get("", response_model=SystemSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    thresholds = get_current_thresholds(db)
    
    # Retrieve strategy
    strat_setting = db.query(SystemSetting).filter(SystemSetting.key == "missing_depth_strategy").first()
    strategy = strat_setting.value_json.strip('"') if strat_setting else "ASSUME_WIDTH"

    return SystemSettingsResponse(
        tolerance_growth_mm=thresholds["tolerance_growth_mm"],
        low_confidence_threshold=thresholds["low_confidence_threshold"],
        low_quality_threshold=thresholds["low_quality_threshold"],
        missing_depth_strategy=strategy,
        demonstration_notice="Demonstration alert threshold values — not clinical guidelines.",
    )


@router.put("", response_model=SystemSettingsResponse)
def update_settings(
    settings_in: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thresholds_dict = {
        "tolerance_growth_mm": settings_in.tolerance_growth_mm,
        "low_confidence_threshold": settings_in.low_confidence_threshold,
        "low_quality_threshold": settings_in.low_quality_threshold,
    }

    db_thresh = db.query(SystemSetting).filter(SystemSetting.key == "alert_thresholds").first()
    if not db_thresh:
        db_thresh = SystemSetting(
            key="alert_thresholds",
            value_json=json.dumps(thresholds_dict),
            description="Configurable measurement tolerance and data quality thresholds",
        )
        db.add(db_thresh)
    else:
        db_thresh.value_json = json.dumps(thresholds_dict)

    db_strat = db.query(SystemSetting).filter(SystemSetting.key == "missing_depth_strategy").first()
    if not db_strat:
        db_strat = SystemSetting(
            key="missing_depth_strategy",
            value_json=json.dumps(settings_in.missing_depth_strategy),
            description="Strategy for handling observations with omitted depth dimension",
        )
        db.add(db_strat)
    else:
        db_strat.value_json = json.dumps(settings_in.missing_depth_strategy)

    db.commit()

    record_audit_event(
        db=db,
        event_type="SYSTEM_SETTINGS_UPDATED",
        entity_type="SystemSetting",
        entity_id=db_thresh.id if db_thresh.id else 1,
        user_id=current_user.id if current_user else None,
        details={"tolerance_growth_mm": settings_in.tolerance_growth_mm},
    )
    db.commit()

    return get_settings(db=db)
