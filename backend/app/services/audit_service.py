import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditEvent

logger = logging.getLogger("polypulse.audit")


def record_audit_event(
    db: Session,
    event_type: str,
    entity_type: str,
    entity_id: int,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditEvent:
    """
    Records an immutable audit event.
    Guarantees no patient-identifying strings (names, emails, MRNs) are logged into the audit details.
    """
    clean_details = {}
    if details:
        # Scrub any potentially identifying keys
        prohibited_keys = {"name", "full_name", "mrn", "email", "dob", "date_of_birth", "ssn"}
        for k, v in details.items():
            if k.lower() not in prohibited_keys:
                clean_details[k] = v

    audit_entry = AuditEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        details_json=json.dumps(clean_details),
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(audit_entry)
    db.flush()

    logger.info(
        f"[AUDIT] Event={event_type} Entity={entity_type}:{entity_id} User={user_id}"
    )
    return audit_entry
