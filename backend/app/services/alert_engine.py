from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Alert, Observation, TwinStateVersion, SystemSetting
from app.config import settings
import json


def get_current_thresholds(db: Session) -> dict:
    """Retrieves current configurable alert thresholds or defaults."""
    thresholds = {
        "tolerance_growth_mm": settings.DEFAULT_TOLERANCE_GROWTH_MM,
        "low_confidence_threshold": settings.DEFAULT_LOW_CONFIDENCE_THRESHOLD,
        "low_quality_threshold": settings.DEFAULT_LOW_QUALITY_THRESHOLD,
    }
    
    db_setting = db.query(SystemSetting).filter(SystemSetting.key == "alert_thresholds").first()
    if db_setting and db_setting.value_json:
        try:
            custom = json.loads(db_setting.value_json)
            thresholds.update(custom)
        except Exception:
            pass
            
    return thresholds


def evaluate_observation_alerts(
    db: Session,
    observation: Observation,
    twin_version: TwinStateVersion,
    previous_observation: Optional[Observation] = None,
) -> List[Alert]:
    """
    Evaluates explicit, documented alert rules for an incoming observation and its twin state.
    Strictly avoids malignancy claims or diagnostic speculation.
    """
    thresholds = get_current_thresholds(db)
    generated_alerts: List[Alert] = []

    # 1. Rule: NEW_OBSERVATION_RECEIVED
    alert_new = Alert(
        patient_id=observation.patient_id,
        observation_id=observation.id,
        twin_version_id=twin_version.id,
        alert_type="NEW_OBSERVATION_RECEIVED",
        severity="INFO",
        title="New Serial Observation Logged",
        explanation=(
            f"Serial observation registered via {observation.source} with dimensions "
            f"{observation.length_mm:.1f} mm x {observation.width_mm:.1f} mm."
        ),
        trigger_rule="rule_new_observation_intake",
        is_acknowledged=False,
        simulated_notification_status="DELIVERED_SIMULATED (In-app Notification)",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    generated_alerts.append(alert_new)

    # 2. Rule: CHANGE_EXCEEDS_TOLERANCE
    tolerance_mm = thresholds["tolerance_growth_mm"]
    if previous_observation is not None:
        delta_l = abs(observation.length_mm - previous_observation.length_mm)
        if delta_l >= tolerance_mm:
            alert_change = Alert(
                patient_id=observation.patient_id,
                observation_id=observation.id,
                twin_version_id=twin_version.id,
                alert_type="CHANGE_EXCEEDS_TOLERANCE",
                severity="WARNING",
                title="Dimensional Change Exceeds Configured Tolerance",
                explanation=(
                    f"Observed longest dimension delta of {delta_l:.1f} mm meets or exceeds "
                    f"the demonstration tolerance threshold of {tolerance_mm:.1f} mm. "
                    f"Clinician review recommended (demonstration threshold, not clinical)."
                ),
                trigger_rule=f"delta_longest_dimension >= {tolerance_mm:.1f}mm",
                is_acknowledged=False,
                simulated_notification_status="DELIVERED_SIMULATED (In-app Notification)",
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            generated_alerts.append(alert_change)

    # 3. Rule: DATA_QUALITY_WARNING
    quality_issues = []
    if observation.measurement_confidence < thresholds["low_confidence_threshold"]:
        quality_issues.append(
            f"Measurement confidence ({observation.measurement_confidence:.2f}) is below "
            f"threshold ({thresholds['low_confidence_threshold']:.2f})"
        )
    if observation.image_quality < thresholds["low_quality_threshold"]:
        quality_issues.append(
            f"Image quality index ({observation.image_quality:.2f}) is below "
            f"threshold ({thresholds['low_quality_threshold']:.2f})"
        )
    if observation.depth_mm is None:
        quality_issues.append("Lesion depth dimension was omitted; volume requires explicit assumption")

    if quality_issues:
        alert_quality = Alert(
            patient_id=observation.patient_id,
            observation_id=observation.id,
            twin_version_id=twin_version.id,
            alert_type="DATA_QUALITY_WARNING",
            severity="ATTENTION",
            title="Data Quality & Confidence Notice",
            explanation="; ".join(quality_issues) + ". Verify calibration and acquisition quality.",
            trigger_rule="confidence < thresh OR quality < thresh OR missing_calibration",
            is_acknowledged=False,
            simulated_notification_status="DELIVERED_SIMULATED (In-app Notification)",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        generated_alerts.append(alert_quality)

    # 4. Rule: AWAITING_CLINICIAN_REVIEW
    alert_review = Alert(
        patient_id=observation.patient_id,
        observation_id=observation.id,
        twin_version_id=twin_version.id,
        alert_type="AWAITING_CLINICIAN_REVIEW",
        severity="INFO",
        title="Awaiting Clinician Longitudinal Review",
        explanation="Serial measurement queued for clinical review and verification.",
        trigger_rule="rule_pending_clinical_signoff",
        is_acknowledged=False,
        simulated_notification_status="DELIVERED_SIMULATED (In-app Notification)",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    generated_alerts.append(alert_review)

    for alert in generated_alerts:
        db.add(alert)

    db.flush()
    return generated_alerts
