import io
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from typing import Tuple, Optional


def generate_synthetic_ultrasound_image(
    patient_mrn: str,
    day_label: str,
    length_mm: float,
    width_mm: float,
    output_path: str,
    width: int = 800,
    height: int = 600,
    mm_per_pixel: float = 0.08,
) -> str:
    """
    Generates a procedurally synthesized uterine B-mode ultrasound image:
    - Sector scan geometry with acoustic shadow/enhancement
    - Endometrial cavity echo pattern
    - Echogenic lesion (polyp) scaled to the specified physical mm dimensions
    - Prominent bold watermark: 'SYNTHETIC — NOT A REAL SCAN'
    - Calibration scale bar and indicators
    """
    # Create dark ultrasound canvas with sector shape
    img = Image.new("RGB", (width, height), color=(10, 12, 16))
    draw = ImageDraw.Draw(img)

    # Sector background gradient and speckle noise
    random.seed(int(length_mm * 100 + width_mm * 10))
    for y in range(80, height - 60):
        # Sector beam fan shape
        fan_half_width = int((y - 60) * 0.75)
        center_x = width // 2
        left_bound = max(40, center_x - fan_half_width)
        right_bound = min(width - 40, center_x + fan_half_width)
        
        for x in range(left_bound, right_bound, 4):
            # Base tissue speckle
            depth_attenuation = max(0.2, 1.0 - (y / height) * 0.5)
            speckle = random.randint(20, 65) * depth_attenuation
            draw.point((x, y), fill=(int(speckle), int(speckle), int(speckle + 5)))

    # Draw uterine myometrium boundary (curved elliptical contour)
    cx, cy = width // 2, height // 2 + 20
    myo_rx, myo_ry = 220, 160
    draw.ellipse(
        [cx - myo_rx, cy - myo_ry, cx + myo_rx, cy + myo_ry],
        outline=(55, 60, 75),
        width=3,
    )

    # Draw endometrial stripe / cavity (hyperechoic lining)
    endo_rx, endo_ry = 120, 60
    draw.ellipse(
        [cx - endo_rx, cy - endo_ry, cx + endo_rx, cy + endo_ry],
        outline=(85, 95, 115),
        width=2,
    )

    # Compute lesion pixel radius from mm and mm_per_pixel
    lesion_rx_px = int(round((length_mm / mm_per_pixel) / 2.0))
    lesion_ry_px = int(round((width_mm / mm_per_pixel) / 2.0))

    # Draw lesion (polyp) within endometrial cavity
    lx, ly = cx + 15, cy - 10
    draw.ellipse(
        [lx - lesion_rx_px, ly - lesion_ry_px, lx + lesion_rx_px, ly + lesion_ry_px],
        fill=(110, 115, 130),
        outline=(160, 170, 200),
        width=2,
    )

    # Measurement caliper crosshairs
    caliper_color = (255, 215, 0)  # Gold calipers
    # Long axis caliper
    draw.line([(lx - lesion_rx_px, ly), (lx + lesion_rx_px, ly)], fill=caliper_color, width=1)
    draw.line([(lx - lesion_rx_px, ly - 4), (lx - lesion_rx_px, ly + 4)], fill=caliper_color, width=2)
    draw.line([(lx + lesion_rx_px, ly - 4), (lx + lesion_rx_px, ly + 4)], fill=caliper_color, width=2)

    # Short axis caliper
    draw.line([(lx, ly - lesion_ry_px), (lx, ly + lesion_ry_px)], fill=caliper_color, width=1)
    draw.line([(lx - 4, ly - lesion_ry_px), (lx + 4, ly - lesion_ry_px)], fill=caliper_color, width=2)
    draw.line([(lx - 4, ly + lesion_ry_px), (lx + 4, ly + lesion_ry_px)], fill=caliper_color, width=2)

    # Calibration scale bar (e.g. 10 mm bar = 10 / mm_per_pixel pixels)
    bar_len_px = int(10.0 / mm_per_pixel)
    bar_x = width - 120
    bar_y = height - 90
    draw.line([(bar_x, bar_y), (bar_x + bar_len_px, bar_y)], fill=(200, 200, 200), width=3)
    draw.line([(bar_x, bar_y - 4), (bar_x, bar_y + 4)], fill=(200, 200, 200), width=2)
    draw.line([(bar_x + bar_len_px, bar_y - 4), (bar_x + bar_len_px, bar_y + 4)], fill=(200, 200, 200), width=2)

    # Overlay Telemetry text
    draw.text((25, 20), f"POLYPULSE RESEARCH SCAN - {day_label}", fill=(200, 200, 220))
    draw.text((25, 38), f"MRN: {patient_mrn} | TIS 0.4 TIB 0.4 MI 0.9", fill=(140, 140, 160))
    draw.text((25, 54), f"L: {length_mm:.1f}mm  W: {width_mm:.1f}mm (Calibrated: {mm_per_pixel:.3f} mm/px)", fill=(240, 200, 100))
    draw.text((bar_x, bar_y - 18), "10 mm", fill=(200, 200, 200))

    # PROMINENT MANDATORY WATERMARK
    watermark_box = [(40, height - 50), (width - 40, height - 15)]
    draw.rectangle(watermark_box, fill=(20, 20, 30))
    draw.rectangle(watermark_box, outline=(220, 70, 70), width=2)
    draw.text(
        (width // 2 - 190, height - 42),
        "SYNTHETIC — NOT A REAL SCAN — DEMO RESEARCH PROTOTYPE",
        fill=(255, 100, 100),
    )

    # Ensure output dir exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG")
    return output_path


def validate_image_upload(file_bytes: bytes, max_bytes: int = 10 * 1024 * 1024) -> Tuple[bool, str, Optional[Tuple[int, int]]]:
    """
    Validates uploaded images:
    1. Enforces size cap.
    2. Validates magic bytes (JPEG or PNG).
    3. Verifies Pillow decoding.
    Returns: (is_valid, error_message, (width, height))
    """
    if len(file_bytes) > max_bytes:
        return False, f"File size exceeds maximum allowed limit ({max_bytes / (1024*1024):.1f} MB)", None

    if len(file_bytes) < 8:
        return False, "File is too small to be a valid image", None

    # Magic byte check
    is_png = file_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = file_bytes.startswith(b"\xff\xd8\xff")

    if not (is_png or is_jpeg):
        return False, "Invalid image format. Only authentic PNG and JPEG images are supported.", None

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()
            width, height = img.size
            if width < 50 or height < 50:
                return False, "Image dimensions are too small (<50x50px)", None
            return True, "", (width, height)
    except Exception as e:
        return False, f"Image file corrupted or invalid: {str(e)}", None
