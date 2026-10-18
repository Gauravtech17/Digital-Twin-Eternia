import io
import json
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Patient, User, Observation, TwinStateVersion, Alert, SimulationEvent, AuditEvent
from app.schemas import ObservationCreate, ProvenanceType, ObservationSource
from app.services.math_engine import compute_ellipsoid_volume, compute_growth_rate, calculate_pixel_measurement
from app.services.synthetic_imaging import validate_image_upload
from app.services.auth_service import hash_password, create_access_token

# Use an in-memory SQLite database with StaticPool so all connections share the memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        # Create default demo users
        clinician = User(
            username="dr_sarah",
            email="sarah.chen@polypulse.internal",
            hashed_password=hash_password("password123"),
            full_name="Dr. Sarah Chen",
            role="CLINICIAN",
        )
        patient_user = User(
            username="patient_elena",
            email="elena@polypulse.internal",
            hashed_password=hash_password("password123"),
            full_name="Elena Rostova",
            role="PATIENT",
            patient_id=1,
        )
        db.add_all([clinician, patient_user])

        # Create demo patient
        patient = Patient(
            id=1,
            mrn="MRN-TEST-001",
            full_name="Test Patient",
            date_of_birth="1990-01-01",
            biological_sex="Female",
        )
        patient2 = Patient(
            id=2,
            mrn="MRN-TEST-002",
            full_name="Other Patient",
            date_of_birth="1992-02-02",
            biological_sex="Female",
        )
        db.add_all([patient, patient2])
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# -------------------------------------------------------------
# 1. Mathematical Engine & Boundary Condition Tests
# -------------------------------------------------------------
def test_volume_calculation_ellipsoid_correctness():
    # V = (pi/6) * L * W * D
    # Example: L=10, W=6, D=4 => (pi/6) * 240 = 40 * pi ≈ 125.66
    vol, formula, assumption, assumed = compute_ellipsoid_volume(10.0, 6.0, 4.0)
    assert vol == 125.66
    assert formula == "V = (pi/6) * L * W * D"
    assert assumed is False
    assert assumption == "None"


def test_volume_omitted_when_depth_missing_without_assumption():
    # If depth is None and no assumption is selected, volume must be None
    vol, formula, assumption, assumed = compute_ellipsoid_volume(10.0, 6.0, None)
    assert vol is None
    assert "omitted" in assumption.lower()
    assert assumed is False


def test_volume_computed_when_explicit_assumption_selected():
    # When user selects ASSUME_DEPTH_EQUALS_WIDTH: D = W = 6.0
    # V = (pi/6) * 10 * 6 * 6 = 60 * pi ≈ 188.50
    vol, formula, assumption, assumed = compute_ellipsoid_volume(
        10.0, 6.0, None, missing_depth_assumption="ASSUME_DEPTH_EQUALS_WIDTH"
    )
    assert vol == 188.50
    assert assumed is True
    assert "D = W" in assumption


def test_growth_rate_calculation():
    # 2 observations separated by 30 days: 8.0 mm to 9.0 mm (+1.0 mm)
    # Rate = (1.0 / 30) * 30.4375 ≈ +1.015 mm/month
    d1 = datetime(2026, 1, 1)
    d2 = datetime(2026, 1, 31)
    rate, days = compute_growth_rate(9.0, 8.0, d2, d1)
    assert days == 30
    assert rate == round((1.0 / 30.0) * 30.4375, 3)


def test_calibration_handling():
    # Without calibration, return px and disable physical reporting
    val_uncal, unit_uncal, cal_flag = calculate_pixel_measurement(100.0, None)
    assert val_uncal == 100.0
    assert unit_uncal == "px, uncalibrated"
    assert cal_flag is False

    # With calibration (0.08 mm/px)
    val_cal, unit_cal, cal_flag = calculate_pixel_measurement(100.0, 0.08)
    assert val_cal == 8.0
    assert unit_cal == "mm"
    assert cal_flag is True


# -------------------------------------------------------------
# 2. Upload Validation Tests (Magic Bytes & Size Cap)
# -------------------------------------------------------------
def test_upload_magic_bytes_validation():
    # Valid authentic PNG generated via Pillow
    im = Image.new("RGB", (100, 100), color="gray")
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    valid_png_bytes = buf.getvalue()

    is_valid, err, dims = validate_image_upload(valid_png_bytes)
    assert is_valid is True
    assert dims == (100, 100)

    # Disallowed executable or text file masquerading as image
    fake_bytes = b"MZ\x90\x00\x03\x00\x00\x00not an image"
    is_valid, err, dims = validate_image_upload(fake_bytes)
    assert is_valid is False
    assert "format" in err.lower() or "authentic" in err.lower()

    # Oversized file
    oversized = valid_png_bytes + b"\x00" * 2000
    is_valid, err, dims = validate_image_upload(oversized, max_bytes=100)
    assert is_valid is False
    assert "exceeds" in err.lower()


# -------------------------------------------------------------
# 3. API Pipeline, Twin Version Immutability & Alerts
# -------------------------------------------------------------
def test_create_observation_pipeline_and_twin_version(client):
    payload = {
        "patient_id": 1,
        "observed_at": "2026-06-01T10:00:00",
        "source": "MANUAL",
        "length_mm": 8.0,
        "width_mm": 6.0,
        "depth_mm": 5.5,
        "measurement_confidence": 0.95,
        "image_quality": 0.90,
        "notes": "First test observation",
        "provenance_tag": "MANUAL",
    }
    res = client.post("/api/v1/observations", json=payload)
    assert res.status_code == 201
    obs_data = res.json()
    assert obs_data["length_mm"] == 8.0
    assert obs_data["measurements"]["volume_mm3"] is not None

    # Check that TwinStateVersion 1 was created
    twin_res = client.get("/api/v1/twin/patient/1/current")
    assert twin_res.status_code == 200
    twin_data = twin_res.json()
    assert twin_data["version_number"] == 1
    assert twin_data["lesion_length_mm"] == 8.0
    assert twin_data["illustrative_flag"] is True

    # Now post a second observation with large change (+1.5 mm, exceeds tolerance)
    payload2 = {
        "patient_id": 1,
        "observed_at": "2026-07-01T10:00:00",
        "source": "SIMULATED_STREAM",
        "length_mm": 9.5,
        "width_mm": 6.8,
        "depth_mm": 6.0,
        "measurement_confidence": 0.92,
        "image_quality": 0.88,
        "notes": "Second test observation with expansion",
        "provenance_tag": "SIMULATED",
    }
    res2 = client.post("/api/v1/observations", json=payload2)
    assert res2.status_code == 201

    # Check that TwinStateVersion 2 was created and version 1 was NOT overwritten
    twin_res2 = client.get("/api/v1/twin/patient/1/current")
    assert twin_res2.status_code == 200
    assert twin_res2.json()["version_number"] == 2
    assert twin_res2.json()["delta_longest_dimension_mm"] == 1.5

    versions_res = client.get("/api/v1/twin/patient/1/versions")
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 2
    assert versions[0]["version_number"] == 1
    assert versions[1]["version_number"] == 2

    # Verify CHANGE_EXCEEDS_TOLERANCE alert was triggered
    alerts_res = client.get("/api/v1/alerts?patient_id=1")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    alert_types = [a["alert_type"] for a in alerts]
    assert "CHANGE_EXCEEDS_TOLERANCE" in alert_types
    assert "NEW_OBSERVATION_RECEIVED" in alert_types


# -------------------------------------------------------------
# 4. Simulation Stream Idempotency Test
# -------------------------------------------------------------
def test_simulation_ingest_idempotency(client):
    idempotency_key = "test-stream-uuid-12345"
    sim_payload = {
        "idempotency_key": idempotency_key,
        "patient_id": 1,
        "observed_at": "2026-08-01T12:00:00",
        "source": "SIMULATED_STREAM",
        "length_mm": 9.8,
        "width_mm": 7.0,
        "depth_mm": 6.5,
        "measurement_confidence": 0.88,
        "image_quality": 0.85,
    }

    # First ingest
    r1 = client.post("/api/v1/simulation/ingest", json=sim_payload)
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["status"] == "PROCESSED"
    first_obs_id = data1["observation"]["id"]

    # Replay with same idempotency key
    r2 = client.post("/api/v1/simulation/ingest", json=sim_payload)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["status"] == "DUPLICATE_IDEMPOTENT_IGNORED"
    assert data2["observation"]["id"] == first_obs_id

    # Verify no duplicate observation record was inserted
    obs_list = client.get("/api/v1/observations?patient_id=1").json()
    matching = [o for o in obs_list if o["id"] == first_obs_id]
    assert len(matching) == 1


# -------------------------------------------------------------
# 5. Role-Based Access Isolation (Patient Portal)
# -------------------------------------------------------------
def test_patient_user_cannot_access_other_patients(client):
    # Elena is linked to patient_id 1
    token = create_access_token(data={"sub": "patient_elena", "role": "PATIENT"})
    headers = {"Authorization": f"Bearer {token}"}

    # Allowed to access own record
    r_own = client.get("/api/v1/patients/1", headers=headers)
    assert r_own.status_code == 200

    # Forbidden from accessing patient 2
    r_other = client.get("/api/v1/patients/2", headers=headers)
    assert r_other.status_code == 403


# -------------------------------------------------------------
# 6. Report Generation & Download Content Verification
# -------------------------------------------------------------
def test_pdf_and_html_report_generation(client):
    # Ensure patient 1 has at least 1 observation
    client.post("/api/v1/observations", json={
        "patient_id": 1,
        "observed_at": "2026-06-01T10:00:00",
        "source": "MANUAL",
        "length_mm": 8.0,
        "width_mm": 6.0,
        "depth_mm": 5.0,
        "measurement_confidence": 0.90,
        "image_quality": 0.85,
        "notes": "Baseline",
        "provenance_tag": "MANUAL",
    })

    # Test PDF download
    pdf_res = client.get("/api/v1/reports/patient/1/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # valid binary PDF bytes
    assert pdf_res.content.startswith(b"%PDF")

    # Test HTML download
    html_res = client.get("/api/v1/reports/patient/1/html")
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers["content-type"]
    assert "V = (π / 6)" in html_res.text


# -------------------------------------------------------------
# 7. Timezone Normalization Regression Tests (Fix Offset-Naive vs Offset-Aware)
# -------------------------------------------------------------
def test_timezone_aware_and_naive_subtraction_regression(client):
    """
    Directly tests that ingestion of offset-aware ISO strings with 'Z' and explicit offsets
    succeeds without raising: 'can't subtract offset-naive and offset-aware datetimes'.
    """
    # 1. Baseline observation with naive date string
    r1 = client.post("/api/v1/observations", json={
        "patient_id": 1,
        "observed_at": "2026-06-01T09:30:00",
        "source": "MANUAL",
        "length_mm": 8.0,
        "width_mm": 6.0,
        "depth_mm": 5.5,
        "measurement_confidence": 0.90,
        "image_quality": 0.85,
        "provenance_tag": "MANUAL",
    })
    assert r1.status_code == 201

    # 2. Subsequent observation with trailing 'Z' (offset-aware UTC ISO string)
    r2 = client.post("/api/v1/observations", json={
        "patient_id": 1,
        "observed_at": "2026-07-01T14:30:00.000Z",
        "source": "SIMULATED_STREAM",
        "length_mm": 9.2,
        "width_mm": 6.8,
        "depth_mm": 6.0,
        "measurement_confidence": 0.94,
        "image_quality": 0.91,
        "provenance_tag": "SIMULATED",
    })
    assert r2.status_code == 201
    obs2_data = r2.json()
    assert obs2_data["measurements"]["growth_rate_mm_per_month"] is not None
    assert obs2_data["measurements"]["growth_rate_interval_days"] == 30

    # 3. Subsequent observation with explicit timezone offset (+05:30)
    r3 = client.post("/api/v1/observations", json={
        "patient_id": 1,
        "observed_at": "2026-08-01T18:00:00+05:30",
        "source": "SIMULATED_STREAM",
        "length_mm": 10.4,
        "width_mm": 7.4,
        "depth_mm": 6.6,
        "measurement_confidence": 0.95,
        "image_quality": 0.92,
        "provenance_tag": "SIMULATED",
    })
    assert r3.status_code == 201

    # 4. Ingest via Simulation API with 'Z'
    r_sim = client.post("/api/v1/simulation/ingest", json={
        "idempotency_key": "regress-tz-key-001",
        "patient_id": 1,
        "observed_at": "2026-09-01T08:00:00Z",
        "source": "SIMULATED_STREAM",
        "length_mm": 11.0,
        "width_mm": 7.8,
        "depth_mm": 7.0,
        "measurement_confidence": 0.95,
        "image_quality": 0.92,
    })
    assert r_sim.status_code == 200
    sim_data = r_sim.json()
    assert sim_data["status"] == "PROCESSED"
    assert sim_data["twin_version"]["version_number"] >= 4
