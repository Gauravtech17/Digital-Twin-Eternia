import sys
from pathlib import Path
from datetime import datetime

backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Observation, TwinStateVersion, SimulationEvent
from app.schemas import SimulationIngestRequest, ProvenanceType
from app.routers.simulation import ingest_simulated_stream_event

def test_full_workflow():
    db = SessionLocal()
    try:
        patient = db.query(Patient).filter(Patient.mrn == "MRN-2026-081").first()
        assert patient is not None, "Patient Elena Rostova not found"
        initial_obs_count = db.query(Observation).filter(Observation.patient_id == patient.id).count()
        initial_twin_count = db.query(TwinStateVersion).filter(TwinStateVersion.patient_id == patient.id).count()
        print(f"[TEST 1] Patient verified: {patient.full_name} ({patient.mrn})")
        print(f"         Initial Observations: {initial_obs_count}, Twin Versions: {initial_twin_count}")

        # Ingest new simulated assessment observation
        idempotency_key = f"verify-{int(datetime.now().timestamp())}"
        req = SimulationIngestRequest(
            idempotency_key=idempotency_key,
            patient_id=patient.id,
            observed_at=datetime.now().isoformat(),
            source="SIMULATED_STREAM",
            length_mm=11.2,
            width_mm=7.8,
            depth_mm=7.2,
            missing_depth_assumption="ASSUME_DEPTH_EQUALS_WIDTH",
            measurement_confidence=0.95,
            image_quality=0.92,
            notes="End-to-end test verification assessment",
        )

        resp = ingest_simulated_stream_event(req=req, db=db, current_user=None)
        assert resp.status == "PROCESSED", f"Expected PROCESSED, got {resp.status}"
        assert resp.twin_version.version_number == initial_twin_count + 1, "Twin version number did not increment"
        assert resp.observation.length_mm == 11.2, "Observation length mismatch"
        print(f"[TEST 2] Simulation Ingest successful! New Twin Version: v{resp.twin_version.version_number}")
        print(f"         Derived Volume: {resp.twin_version.lesion_volume_mm3:.1f} mm³")
        print(f"         Delta Longest: {resp.twin_version.delta_longest_dimension_mm:+.2f} mm")

        # Verify Database Persistence
        db_obs = db.query(Observation).filter(Observation.id == resp.observation.id).first()
        assert db_obs is not None, "Observation not persisted in database"
        db_twin = db.query(TwinStateVersion).filter(TwinStateVersion.id == resp.twin_version.id).first()
        assert db_twin is not None, "TwinStateVersion not persisted in database"
        print(f"[TEST 3] Persistence verified in SQLite database.")

        # Test Idempotency: replay identical request
        replay_resp = ingest_simulated_stream_event(req=req, db=db, current_user=None)
        assert replay_resp.status == "DUPLICATE_IDEMPOTENT_IGNORED", "Idempotency check failed"
        assert replay_resp.observation.id == resp.observation.id, "Idempotent response returned wrong observation"
        final_obs_count = db.query(Observation).filter(Observation.patient_id == patient.id).count()
        assert final_obs_count == initial_obs_count + 1, "Duplicate observation was created!"
        print(f"[TEST 4] Idempotency verified: replaying identical key created 0 duplicate records.")

        print("ALL ACCEPTANCE WORKFLOW INTEGRATION CHECKS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_full_workflow()
