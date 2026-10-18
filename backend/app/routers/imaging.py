import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import settings
from app.database import get_db
from app.models import ImagingAsset, Annotation, Observation, Patient, User
from app.schemas import ImagingAssetResponse, AnnotationCreate, AnnotationResponse
from app.services.auth_service import get_current_user
from app.services.synthetic_imaging import validate_image_upload
from app.services.math_engine import calculate_pixel_measurement
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/imaging", tags=["Imaging Lab & Annotations"])


@router.post("/upload", response_model=ImagingAssetResponse)
async def upload_imaging_asset(
    patient_id: int = Form(...),
    observation_id: Optional[int] = Form(None),
    mm_per_pixel: Optional[float] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} does not exist.",
        )

    if observation_id:
        obs = db.query(Observation).filter(Observation.id == observation_id).first()
        if not obs or obs.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Observation does not belong to specified patient.",
            )

    file_bytes = await file.read()
    is_valid, err_msg, dims = validate_image_upload(file_bytes, max_bytes=settings.MAX_UPLOAD_SIZE_BYTES)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image upload validation failed: {err_msg}",
        )

    width_px, height_px = dims
    file_ext = ".png" if file_bytes.startswith(b"\x89PNG") else ".jpg"
    unique_filename = f"{patient.mrn}_{uuid.uuid4().hex[:8]}{file_ext}"
    upload_path = Path(settings.UPLOAD_DIR) / unique_filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, "wb") as f:
        f.write(file_bytes)

    is_calibrated = (mm_per_pixel is not None and mm_per_pixel > 0)
    asset = ImagingAsset(
        observation_id=observation_id,
        patient_id=patient_id,
        file_path=str(upload_path),
        file_name=file.filename or unique_filename,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type or ("image/png" if file_ext == ".png" else "image/jpeg"),
        width_px=width_px,
        height_px=height_px,
        mm_per_pixel=mm_per_pixel if is_calibrated else None,
        is_calibrated=is_calibrated,
        quality_score=0.88 if is_calibrated else 0.65,
        is_synthetic=False,
        watermark_applied=False,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    record_audit_event(
        db=db,
        event_type="IMAGE_UPLOADED",
        entity_type="ImagingAsset",
        entity_id=asset.id,
        user_id=current_user.id if current_user else None,
        details={"file_size": len(file_bytes), "calibrated": is_calibrated},
    )
    db.commit()

    return ImagingAssetResponse(
        id=asset.id,
        observation_id=asset.observation_id,
        patient_id=asset.patient_id,
        file_name=asset.file_name,
        file_size_bytes=asset.file_size_bytes,
        mime_type=asset.mime_type,
        width_px=asset.width_px,
        height_px=asset.height_px,
        mm_per_pixel=asset.mm_per_pixel,
        is_calibrated=asset.is_calibrated,
        quality_score=asset.quality_score,
        is_synthetic=asset.is_synthetic,
        watermark_applied=asset.watermark_applied,
        created_at=asset.created_at,
        image_url=f"/api/v1/imaging/asset/{asset.id}/file",
    )


@router.get("/patient/{patient_id}", response_model=List[ImagingAssetResponse])
def list_patient_imaging_assets(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    assets = (
        db.query(ImagingAsset)
        .filter(ImagingAsset.patient_id == patient_id)
        .order_by(ImagingAsset.created_at.desc())
        .all()
    )
    res = []
    for a in assets:
        res.append(ImagingAssetResponse(
            id=a.id,
            observation_id=a.observation_id,
            patient_id=a.patient_id,
            file_name=a.file_name,
            file_size_bytes=a.file_size_bytes,
            mime_type=a.mime_type,
            width_px=a.width_px,
            height_px=a.height_px,
            mm_per_pixel=a.mm_per_pixel,
            is_calibrated=a.is_calibrated,
            quality_score=a.quality_score,
            is_synthetic=a.is_synthetic,
            watermark_applied=a.watermark_applied,
            created_at=a.created_at,
            image_url=f"/api/v1/imaging/asset/{a.id}/file",
        ))
    return res


@router.get("/asset/{asset_id}/file")
def get_imaging_asset_file(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(ImagingAsset).filter(ImagingAsset.id == asset_id).first()
    if not asset or not os.path.exists(asset.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imaging asset file could not be found on storage.",
        )
    return FileResponse(asset.file_path, media_type=asset.mime_type)


@router.post("/annotations", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
def create_annotation(
    anno_in: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    asset = db.query(ImagingAsset).filter(ImagingAsset.id == anno_in.imaging_asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Imaging asset not found.")

    unit = "mm" if asset.is_calibrated else "px, uncalibrated"
    anno = Annotation(
        imaging_asset_id=anno_in.imaging_asset_id,
        created_by_user_id=current_user.id if current_user else None,
        shape_type=anno_in.shape_type,
        coordinates_json=anno_in.coordinates_json,
        measurement_value=anno_in.measurement_value,
        measurement_unit=unit,
        label=anno_in.label,
        notes=anno_in.notes,
    )
    db.add(anno)
    db.commit()
    db.refresh(anno)

    record_audit_event(
        db=db,
        event_type="ANNOTATION_CREATED",
        entity_type="Annotation",
        entity_id=anno.id,
        user_id=current_user.id if current_user else None,
        details={"shape_type": anno.shape_type, "unit": unit},
    )
    db.commit()
    return anno


@router.get("/asset/{asset_id}/annotations", response_model=List[AnnotationResponse])
def get_asset_annotations(asset_id: int, db: Session = Depends(get_db)):
    return db.query(Annotation).filter(Annotation.imaging_asset_id == asset_id).all()


@router.delete("/annotations/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    anno = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not anno:
        raise HTTPException(status_code=404, detail="Annotation not found.")
    db.delete(anno)
    db.commit()
    return None
