import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models import SimulationEvent, Observation, TwinStateVersion, Alert, AuditEvent, User
from app.schemas import (
    SimulationIngestRequest,
    SimulationIngestResponse,
    ObservationCreate,
    ObservationResponse,
    TwinStateVersionResponse,
    AlertResponse,
    ProvenanceType,
)
from app.services.auth_service import get_current_user
from app.services.twin_engine import process_new_observation
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/simulation", tags=["Simulation Console (Proposed Wearable Stand-in)"])


@router.post("/ingest", response_model=SimulationIngestResponse)
def ingest_simulated_stream_event(
    req: SimulationIngestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests an observation from the simulated continuous ultrasound stream.
    Strictly verifies idempotency: if the idempotency_key has already been processed,
    returns the previously recorded observation and twin version rather than duplicating data.
    """
    # 1. Idempotency Check
    existing_event = (
        db.query(SimulationEvent)
        .filter(SimulationEvent.idempotency_key == req.idempotency_key)
        .first()
    )

    if existing_event:
        # Event was already processed: retrieve the existing observation and twin version
        payload = json.loads(existing_event.raw_payload_json)
        obs_id = payload.get("generated_observation_id")
        obs = db.query(Observation).filter(Observation.id == obs_id).first()
        twin = db.query(TwinStateVersion).filter(TwinStateVersion.observation_id == obs_id).first() if obs else None
        alerts = db.query(Alert).filter(Alert.observation_id == obs_id).all() if obs else []

        if obs and twin:
            return SimulationIngestResponse(
                status="DUPLICATE_IDEMPOTENT_IGNORED",
                idempotency_key=req.idempotency_key,
                patient_id=req.patient_id,
                observation=ObservationResponse.model_validate(obs),
                twin_version=TwinStateVersionResponse.model_validate(twin),
                alerts_generated=[AlertResponse.model_validate(a) for a in alerts],
                audit_event_id=0,
                research_notice="Idempotent replay: record previously committed. No duplicate created.",
            )

    # 2. Process new event through full pipeline
    obs_create_data = ObservationCreate(
        patient_id=req.patient_id,
        observed_at=req.observed_at,
        source=req.source,
        length_mm=req.length_mm,
        width_mm=req.width_mm,
        depth_mm=req.depth_mm,
        missing_depth_assumption=req.missing_depth_assumption,
        measurement_confidence=req.measurement_confidence,
        image_quality=req.image_quality,
        notes=req.notes or "Simulated stream event from proposed wearable ultrasound concept",
        provenance_tag=ProvenanceType.SIMULATED,
    )

    try:
        observation, twin_version, alerts = process_new_observation(
            db=db,
            obs_data=obs_create_data,
            user_id=current_user.id if current_user else None,
        )

        sim_event = SimulationEvent(
            idempotency_key=req.idempotency_key,
            patient_id=req.patient_id,
            raw_payload_json=json.dumps({
                "request": req.model_dump(mode="json"),
                "generated_observation_id": observation.id,
                "generated_twin_version_id": twin_version.id,
            }),
            status="PROCESSED",
            processed_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(sim_event)
        db.commit()

        audit = record_audit_event(
            db=db,
            event_type="SIMULATION_STREAM_INGESTED",
            entity_type="SimulationEvent",
            entity_id=sim_event.id,
            user_id=current_user.id if current_user else None,
            details={"idempotency_key": req.idempotency_key},
        )
        db.commit()

        db.refresh(observation)
        db.refresh(twin_version)

        return SimulationIngestResponse(
            status="PROCESSED",
            idempotency_key=req.idempotency_key,
            patient_id=req.patient_id,
            observation=ObservationResponse.model_validate(observation),
            twin_version=TwinStateVersionResponse.model_validate(twin_version),
            alerts_generated=[AlertResponse.model_validate(a) for a in alerts],
            audit_event_id=audit.id,
            research_notice="Research prototype — not clinically validated.",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation ingestion pipeline failed: {str(e)}",
        )
