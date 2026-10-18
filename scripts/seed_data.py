import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.database import SessionLocal, Base, engine
from app.models import User, Patient, ImagingAsset, SystemSetting
from app.schemas import ObservationCreate, ProvenanceType, ObservationSource
from app.services.auth_service import hash_password
from app.services.twin_engine import process_new_observation
from app.services.synthetic_imaging import generate_synthetic_ultrasound_image
from app.config import settings


def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding demo users...")
        # Demo Users
        clinician = User(
            username="dr_sarah",
            email="sarah.chen@polypulse-demo.internal",
            hashed_password=hash_password("password123"),
            full_name="Dr. Sarah Chen, MD",
            role="CLINICIAN",
        )
        admin = User(
            username="admin_marcus",
            email="marcus.vance@polypulse-demo.internal",
            hashed_password=hash_password("password123"),
            full_name="Marcus Vance (Admin)",
            role="ADMIN",
        )
        db.add_all([clinician, admin])
        db.commit()

        print("Seeding default system settings...")
        thresh_setting = SystemSetting(
            key="alert_thresholds",
            value_json='{"tolerance_growth_mm": 1.0, "low_confidence_threshold": 0.60, "low_quality_threshold": 0.50}',
            description="Default demonstration tolerance and quality thresholds",
        )
        db.add(thresh_setting)
        db.commit()

        print("Seeding fictional patients...")
        # 3 Fictional Patients
        p1 = Patient(
            mrn="MRN-2026-081",
            full_name="Elena Rostova",
            date_of_birth="1994-05-12",
            biological_sex="Female",
            notes="Fictional patient presenting with asymptomatic solitary endometrial polyp. Enrolled in serial observational tracking protocol.",
        )
        p2 = Patient(
            mrn="MRN-2026-144",
            full_name="Amara Okafor",
            date_of_birth="1989-11-23",
            biological_sex="Female",
            notes="Fictional patient with mild abnormal uterine bleeding. Monitoring response over serial monthly scans.",
        )
        p3 = Patient(
            mrn="MRN-2026-290",
            full_name="Sofia Lindqvist",
            date_of_birth="1992-03-08",
            biological_sex="Female",
            notes="Fictional patient with active serial tracking; rapid dimensional change noted.",
        )
        db.add_all([p1, p2, p3])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        db.refresh(p3)

        # Create Patient user linked to Elena
        patient_user = User(
            username="patient_elena",
            email="elena.rostova@polypulse-demo.internal",
            hashed_password=hash_password("password123"),
            full_name="Elena Rostova",
            role="PATIENT",
            patient_id=p1.id,
        )
        db.add(patient_user)
        db.commit()

        # Seed Observations via the same atomic backend pipeline as live intake
        base_time = datetime(2026, 6, 1, 9, 30)

        # -------------------------------------------------------------
        # Patient 1: Stable Trajectory (marginal fluctuation < 0.3mm)
        # -------------------------------------------------------------
        print("Seeding Patient 1: Stable Trajectory...")
        p1_data = [
            (0, 8.0, 6.0, 5.8, ObservationSource.MANUAL, 0.92, 0.88, "Baseline clinical pelvic ultrasound."),
            (30, 8.1, 6.1, 5.9, ObservationSource.SIMULATED_STREAM, 0.89, 0.85, "Serial tracking checkpoint Day 30; dimensionally stationary."),
            (60, 8.2, 6.0, 5.8, ObservationSource.UPLOAD, 0.90, 0.86, "Day 60 follow-up scan; stable lesion margins."),
            (90, 8.1, 6.1, 5.9, ObservationSource.SIMULATED_STREAM, 0.91, 0.87, "Day 90 serial stream observation; steady state."),
        ]
        for days, l, w, d, src, conf, qual, note in p1_data:
            obs_in = ObservationCreate(
                patient_id=p1.id,
                observed_at=base_time + timedelta(days=days),
                source=src,
                length_mm=l,
                width_mm=w,
                depth_mm=d,
                measurement_confidence=conf,
                image_quality=qual,
                notes=note,
                provenance_tag=ProvenanceType.MANUAL if src == ObservationSource.MANUAL else ProvenanceType.SIMULATED,
            )
            obs, twin, alerts = process_new_observation(db, obs_in, user_id=clinician.id)
            db.commit()

            # Procedural Synthetic Ultrasound Image
            img_filename = f"scan_{p1.mrn}_day{days}.png"
            img_path = Path(settings.UPLOAD_DIR) / img_filename
            generate_synthetic_ultrasound_image(
                patient_mrn=p1.mrn,
                day_label=f"Day {days}",
                length_mm=l,
                width_mm=w,
                output_path=str(img_path),
                mm_per_pixel=0.08,
            )

            asset = ImagingAsset(
                observation_id=obs.id,
                patient_id=p1.id,
                file_path=str(img_path),
                file_name=img_filename,
                file_size_bytes=os.path.getsize(img_path),
                mime_type="image/png",
                width_px=800,
                height_px=600,
                mm_per_pixel=0.08,
                is_calibrated=True,
                quality_score=qual,
                is_synthetic=True,
                watermark_applied=True,
            )
            db.add(asset)
            db.commit()

        # -------------------------------------------------------------
        # Patient 2: Gradual Growth Trajectory (slow ~0.4 mm/scan)
        # -------------------------------------------------------------
        print("Seeding Patient 2: Gradual Growth Trajectory...")
        p2_data = [
            (0, 6.5, 4.8, 4.6, ObservationSource.MANUAL, 0.90, 0.85, "Initial transvaginal scan identifying intracavitary lesion."),
            (35, 7.0, 5.1, 4.9, ObservationSource.UPLOAD, 0.88, 0.82, "Serial checkpoint Day 35 showing mild elongation."),
            (70, 7.5, 5.5, 5.2, ObservationSource.SIMULATED_STREAM, 0.87, 0.80, "Day 70 simulated stream observation; steady gradual increment."),
            (105, 8.0, 5.9, 5.6, ObservationSource.UPLOAD, 0.89, 0.84, "Day 105 verification scan."),
        ]
        for days, l, w, d, src, conf, qual, note in p2_data:
            obs_in = ObservationCreate(
                patient_id=p2.id,
                observed_at=base_time + timedelta(days=days),
                source=src,
                length_mm=l,
                width_mm=w,
                depth_mm=d,
                measurement_confidence=conf,
                image_quality=qual,
                notes=note,
                provenance_tag=ProvenanceType.MANUAL if src == ObservationSource.MANUAL else ProvenanceType.SIMULATED,
            )
            obs, twin, alerts = process_new_observation(db, obs_in, user_id=clinician.id)
            db.commit()

            img_filename = f"scan_{p2.mrn}_day{days}.png"
            img_path = Path(settings.UPLOAD_DIR) / img_filename
            generate_synthetic_ultrasound_image(
                patient_mrn=p2.mrn,
                day_label=f"Day {days}",
                length_mm=l,
                width_mm=w,
                output_path=str(img_path),
                mm_per_pixel=0.075,
            )

            asset = ImagingAsset(
                observation_id=obs.id,
                patient_id=p2.id,
                file_path=str(img_path),
                file_name=img_filename,
                file_size_bytes=os.path.getsize(img_path),
                mime_type="image/png",
                width_px=800,
                height_px=600,
                mm_per_pixel=0.075,
                is_calibrated=True,
                quality_score=qual,
                is_synthetic=True,
                watermark_applied=True,
            )
            db.add(asset)
            db.commit()

        # -------------------------------------------------------------
        # Patient 3: High Growth & Data-Quality Case (Exceeds Tolerance)
        # -------------------------------------------------------------
        print("Seeding Patient 3: High Growth Trajectory (Exceeds Tolerance)...")
        p3_data = [
            (0, 7.2, 5.0, 4.8, ObservationSource.MANUAL, 0.91, 0.88, "Baseline clinical examination."),
            (28, 8.5, 5.8, None, ObservationSource.UPLOAD, 0.55, 0.48, "Scan Day 28: rapid change (+1.3mm), missing depth, low quality acoustic shadow."),
            (56, 10.1, 7.2, 6.9, ObservationSource.SIMULATED_STREAM, 0.86, 0.82, "Scan Day 56: continued marked expansion (+1.6mm), exceeds tolerance threshold."),
        ]
        for days, l, w, d, src, conf, qual, note in p3_data:
            obs_in = ObservationCreate(
                patient_id=p3.id,
                observed_at=base_time + timedelta(days=days),
                source=src,
                length_mm=l,
                width_mm=w,
                depth_mm=d,
                missing_depth_assumption="ASSUME_DEPTH_EQUALS_WIDTH" if d is None else None,
                measurement_confidence=conf,
                image_quality=qual,
                notes=note,
                provenance_tag=ProvenanceType.MANUAL if src == ObservationSource.MANUAL else ProvenanceType.SIMULATED,
            )
            obs, twin, alerts = process_new_observation(db, obs_in, user_id=clinician.id)
            db.commit()

            img_filename = f"scan_{p3.mrn}_day{days}.png"
            img_path = Path(settings.UPLOAD_DIR) / img_filename
            generate_synthetic_ultrasound_image(
                patient_mrn=p3.mrn,
                day_label=f"Day {days}",
                length_mm=l,
                width_mm=w,
                output_path=str(img_path),
                mm_per_pixel=0.082,
            )

            asset = ImagingAsset(
                observation_id=obs.id,
                patient_id=p3.id,
                file_path=str(img_path),
                file_name=img_filename,
                file_size_bytes=os.path.getsize(img_path),
                mime_type="image/png",
                width_px=800,
                height_px=600,
                mm_per_pixel=0.082 if conf > 0.6 else None,  # intentional calibration test case
                is_calibrated=(conf > 0.6),
                quality_score=qual,
                is_synthetic=True,
                watermark_applied=True,
            )
            db.add(asset)
            db.commit()

        print("Seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
