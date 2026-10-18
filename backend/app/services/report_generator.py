import io
from datetime import datetime, timezone
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session

from app.models import Patient, Observation, TwinStateVersion, Alert, ReviewRecord, SystemSetting
from app.services.alert_engine import get_current_thresholds


def generate_html_report(patient: Patient, db: Session) -> str:
    """Generates a downloadable, self-contained HTML clinical summary report from stored records."""
    thresholds = get_current_thresholds(db)
    observations = (
        db.query(Observation)
        .filter(Observation.patient_id == patient.id)
        .order_by(Observation.observed_at)
        .all()
    )
    alerts = (
        db.query(Alert)
        .filter(Alert.patient_id == patient.id)
        .order_by(Alert.created_at.desc())
        .all()
    )
    latest_review = (
        db.query(ReviewRecord)
        .filter(ReviewRecord.patient_id == patient.id)
        .order_by(ReviewRecord.created_at.desc())
        .first()
    )
    latest_twin = (
        db.query(TwinStateVersion)
        .filter(TwinStateVersion.patient_id == patient.id)
        .order_by(TwinStateVersion.version_number.desc())
        .first()
    )

    rows_html = ""
    for obs in observations:
        m = obs.measurements
        vol_str = f"{m.volume_mm3:.1f} mm³" if m and m.volume_mm3 else "Omitted (Depth Missing)"
        growth_str = f"{m.growth_rate_mm_per_month:+.2f} mm/mo" if m and m.growth_rate_mm_per_month is not None else "Baseline (N/A)"
        depth_str = f"{obs.depth_mm:.1f} mm" if obs.depth_mm else ("Assumed (D=W)" if m and m.depth_assumed else "Missing")
        rows_html += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">{obs.observed_at.strftime('%Y-%m-%d')}</td>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">{obs.source}</td>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">{obs.length_mm:.1f} × {obs.width_mm:.1f} × {depth_str}</td>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">{vol_str}</td>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">{growth_str}</td>
            <td style="padding: 8px; border: 1px solid #E2E8F0;">Conf: {obs.measurement_confidence:.2f} | Qual: {obs.image_quality:.2f}</td>
        </tr>
        """

    alerts_html = ""
    if alerts:
        for a in alerts:
            alerts_html += f"""
            <li style="margin-bottom: 6px;">
                <strong>[{a.severity}] {a.alert_type}</strong> ({a.created_at.strftime('%Y-%m-%d')}): 
                {a.explanation} <em>(Rule: {a.trigger_rule})</em>
            </li>
            """
    else:
        alerts_html = "<li>No triggered alerts for this patient record.</li>"

    review_text = latest_review.review_notes if latest_review and latest_review.review_notes else "Pending clinical review note entry."
    review_status = latest_review.status if latest_review else "PENDING"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>POLYPULSE Longitudinal Report - {patient.mrn}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1E293B; margin: 40px; background: #FFF; }}
        .header {{ border-bottom: 2px solid #8B5CF6; padding-bottom: 16px; margin-bottom: 24px; }}
        .disclaimer-banner {{ background-color: #FEF2F2; border: 1px solid #EF4444; color: #991B1B; padding: 12px 16px; border-radius: 6px; font-weight: 600; margin-bottom: 24px; font-size: 13px; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #4338CA; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }}
        th {{ background: #F8FAFC; padding: 8px; border: 1px solid #E2E8F0; text-align: left; font-weight: 600; color: #475569; }}
        .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }}
        .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }}
        .badge-pending {{ background: #FEF3C7; color: #92400E; }}
        .badge-reviewed {{ background: #D1FAE5; color: #065F46; }}
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0; color: #24212D; font-size: 24px;">POLYPULSE — Longitudinal Lesion Digital Twin Report</h1>
        <p style="margin: 4px 0 0 0; color: #64748B; font-size: 13px;">Generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Prototype Evaluation Record</p>
    </div>

    <div class="disclaimer-banner">
        MANDATORY REGULATORY NOTICE: Research prototype — not clinically validated — not a medical device.
        This system provides no diagnosis, no malignancy probability score, and no treatment instructions.
        Derived measurements, growth rates, and predictive trends are intended solely for academic research evaluation.
    </div>

    <div class="meta-grid">
        <div>
            <strong>Patient Name:</strong> {patient.full_name} (Fictional Demo)<br>
            <strong>Medical Record Number (MRN):</strong> {patient.mrn}<br>
            <strong>Date of Birth:</strong> {patient.date_of_birth} ({patient.biological_sex})
        </div>
        <div>
            <strong>Latest Twin Version:</strong> Version {latest_twin.version_number if latest_twin else 1}<br>
            <strong>Review Status:</strong> <span class="badge { 'badge-reviewed' if review_status == 'REVIEWED' else 'badge-pending' }">{review_status}</span><br>
            <strong>Configured Growth Tolerance:</strong> {thresholds['tolerance_growth_mm']:.1f} mm (demonstration value)
        </div>
    </div>

    <div class="section-title">Longitudinal Serial Observations</div>
    <table>
        <thead>
            <tr>
                <th>Observed Date</th>
                <th>Source</th>
                <th>Dimensions (L × W × D)</th>
                <th>Derived Volume</th>
                <th>Growth Rate</th>
                <th>Data Quality</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div class="section-title">Mathematical Formulas & Methodological Assumptions</div>
    <ul style="font-size: 13px; color: #334155;">
        <li><strong>Volume Formula:</strong> V = (π / 6) × Length × Width × Depth (Tri-axial ellipsoid). Where depth was omitted, explicit assumption D = W was evaluated.</li>
        <li><strong>Growth Rate:</strong> Δ(Longest Dimension) / Δ(Elapsed Time in Days) × 30.4375 days/month (displayed only for serial scans separated in time).</li>
        <li><strong>Measurement Provenance:</strong> Calibrated against verified physical scales or explicit user entry; uncalibrated pixel measurements are excluded.</li>
    </ul>

    <div class="section-title">Clinical Review & Notes</div>
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 6px; font-size: 13px;">
        <p style="margin: 0;"><strong>Status:</strong> {review_status}</p>
        <p style="margin: 6px 0 0 0;"><strong>Clinician Notes:</strong> {review_text}</p>
    </div>

    <div class="section-title">Alert & Tolerance History</div>
    <ul style="font-size: 13px; color: #334155; padding-left: 20px;">
        {alerts_html}
    </ul>

    <div class="section-title">System & Future Device Research Scope</div>
    <p style="font-size: 12px; color: #64748B;">
        Ultrasound wearable input represents a proposed future concept and is simulated via software.
        No claims of malignancy prediction, improved clinical outcome, or non-invasive diagnostic efficacy are made or implied.
    </p>
</body>
</html>"""
    return html_content


def generate_pdf_report(patient: Patient, db: Session) -> bytes:
    """Generates a downloadable, authentic binary PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#24212D"),
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#991B1B"),
        backColor=colors.HexColor("#FEF2F2"),
        borderColor=colors.HexColor("#EF4444"),
        borderWidth=1,
        borderPadding=6,
        spaceAfter=10,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4338CA"),
        spaceBefore=12,
        spaceAfter=6,
    )
    normal_style = ParagraphStyle(
        "NormalText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
    )

    story = []

    # Title & Timestamp
    story.append(Paragraph("POLYPULSE — Longitudinal Lesion Digital Twin Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Research Prototype Record", normal_style))
    story.append(Spacer(1, 10))

    # Prominent Disclaimer
    story.append(Paragraph(
        "<b>MANDATORY RESEARCH NOTICE:</b> Research prototype — not clinically validated — not a medical device. "
        "Provides no diagnosis, no malignancy probability score, and no treatment instructions. "
        "Intended solely for longitudinal tracking and computational research evaluation.",
        disclaimer_style,
    ))

    # Patient Meta Table
    thresholds = get_current_thresholds(db)
    latest_twin = (
        db.query(TwinStateVersion)
        .filter(TwinStateVersion.patient_id == patient.id)
        .order_by(TwinStateVersion.version_number.desc())
        .first()
    )
    latest_review = (
        db.query(ReviewRecord)
        .filter(ReviewRecord.patient_id == patient.id)
        .order_by(ReviewRecord.created_at.desc())
        .first()
    )

    meta_data = [
        [
            Paragraph(f"<b>Patient:</b> {patient.full_name} (Fictional)", normal_style),
            Paragraph(f"<b>MRN:</b> {patient.mrn}", normal_style),
        ],
        [
            Paragraph(f"<b>DOB / Sex:</b> {patient.date_of_birth} ({patient.biological_sex})", normal_style),
            Paragraph(f"<b>Twin State:</b> Version {latest_twin.version_number if latest_twin else 1}", normal_style),
        ],
        [
            Paragraph(f"<b>Configured Tolerance:</b> {thresholds['tolerance_growth_mm']:.1f} mm (demonstration)", normal_style),
            Paragraph(f"<b>Review Status:</b> {latest_review.status if latest_review else 'PENDING'}", normal_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)

    # Observations Table
    story.append(Paragraph("Longitudinal Serial Observations", section_style))
    observations = (
        db.query(Observation)
        .filter(Observation.patient_id == patient.id)
        .order_by(Observation.observed_at)
        .all()
    )

    obs_table_data = [
        [
            Paragraph("<b>Date</b>", normal_style),
            Paragraph("<b>Source</b>", normal_style),
            Paragraph("<b>Dimensions (L×W×D mm)</b>", normal_style),
            Paragraph("<b>Volume (mm³)</b>", normal_style),
            Paragraph("<b>Rate (mm/mo)</b>", normal_style),
            Paragraph("<b>Confidence / Quality</b>", normal_style),
        ]
    ]

    for obs in observations:
        m = obs.measurements
        vol_str = f"{m.volume_mm3:.1f}" if m and m.volume_mm3 else "Omitted"
        growth_str = f"{m.growth_rate_mm_per_month:+.2f}" if m and m.growth_rate_mm_per_month is not None else "N/A"
        depth_str = f"{obs.depth_mm:.1f}" if obs.depth_mm else ("Assumed" if m and m.depth_assumed else "Missing")
        obs_table_data.append([
            Paragraph(obs.observed_at.strftime('%Y-%m-%d'), normal_style),
            Paragraph(obs.source, normal_style),
            Paragraph(f"{obs.length_mm:.1f} × {obs.width_mm:.1f} × {depth_str}", normal_style),
            Paragraph(vol_str, normal_style),
            Paragraph(growth_str, normal_style),
            Paragraph(f"{obs.measurement_confidence:.2f} / {obs.image_quality:.2f}", normal_style),
        ])

    obs_table = Table(obs_table_data, colWidths=[70, 85, 140, 75, 75, 95])
    obs_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1EAFF")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(obs_table)

    # Formulas & Methodology
    story.append(Paragraph("Mathematical Formulas & Data Assumptions", section_style))
    formulas_text = (
        "• <b>Volume Calculation:</b> V = (π / 6) × L × W × D (triaxial ellipsoid). "
        "If depth is unmeasured, volume is omitted unless explicit spherical/prolate assumption (D = W) is selected.<br/>"
        "• <b>Growth Rate:</b> Rate = (L_current - L_previous) / Δdays × 30.4375 days/month. Enabled only when ≥ 2 observations exist.<br/>"
        "• <b>Tolerance:</b> Configured threshold represents demonstration sensitivity, not an oncological guideline."
    )
    story.append(Paragraph(formulas_text, normal_style))

    # Review Notes
    story.append(Paragraph("Clinical Review & Verification Notes", section_style))
    review_content = (
        f"<b>Status:</b> {latest_review.status if latest_review else 'PENDING'}<br/>"
        f"<b>Notes:</b> {latest_review.review_notes if latest_review and latest_review.review_notes else 'No notes entered yet.'}"
    )
    story.append(Paragraph(review_content, normal_style))

    doc.build(story)
    return buffer.getvalue()
