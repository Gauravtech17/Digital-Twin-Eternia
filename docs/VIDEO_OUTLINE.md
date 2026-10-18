# POLYPULSE — 20-Minute Demonstration Video Outline

*Happiest Health Digital Twin Challenge 2026 Submission*
*Research Prototype — Not Clinically Validated — Not a Medical Device*

---

## Video Metadata & Speaker Information
- **Title:** POLYPULSE: The Living Lesion Digital Twin
- **Target Duration:** 20 Minutes (1,200 Seconds)
- **Competition Track:** Digital Twin Challenge 2026
- **Team Information:** [PLACEHOLDER: Team Name & Member Affiliations pending final submission]
- **Repository URL:** [PLACEHOLDER: Team Git Repository URL]
- **Licensing:** [PLACEHOLDER: License selection pending team decision]

---

## Structured Minute-by-Minute Segment Outline

```
[00:00 - 02:00] Segment 1: Executive Summary, Clinical Motivation & Regulatory Scope
[02:00 - 04:00] Segment 2: System Architecture & The 5-Step Longitudinal Pathway
[04:00 - 06:30] Segment 3: Patient Cohort Selection & Baseline Trajectories
[06:30 - 10:00] Segment 4: Interactive 3D Digital Twin Visualizer (Core Feature)
[10:00 - 12:30] Segment 5: Ultrasound Imaging Lab & Caliper Annotations
[12:30 - 14:30] Segment 6: Proposed Wearable Simulator & Idempotent Stream Pipeline
[14:30 - 16:30] Segment 7: Longitudinal Analytics & Transparent Baseline Forecast
[16:30 - 17:30] Segment 8: Clinician Governance, Review Queue & PHI-Free Audit Trail
[17:30 - 18:30] Segment 9: Dynamic PDF & HTML Clinical Report Export
[18:30 - 19:30] Segment 10: Patient Mobile Portal & Educational Boundaries
[19:30 - 20:00] Segment 11: Summary, Future Hardware Requirements & Conclusion
```

---

## Detailed Segment Script & Presenter Guide

### Segment 1: Executive Motivation & Regulatory Boundaries (00:00 - 02:00)
- **Visual:** POLYPULSE White Theme Overview Dashboard on screen. Close-up on the persistent research prototype banner.
- **Presenter Script:**
  > "Welcome to POLYPULSE — The Living Lesion Digital Twin, developed for the Happiest Health Digital Twin Challenge 2026.
  > Before diving into the technical architecture, our first commitment is to scientific and regulatory integrity:
  > POLYPULSE is an academic research prototype. It is NOT clinically validated, NOT a medical device, and provides NO diagnosis, malignancy risk score, or treatment instructions.
  > In gynecological oncology and benign surveillance, solitary ultrasound scans provide only cross-sectional snapshots. POLYPULSE explores how longitudinal state versioning can help clinicians observe spatial growth velocity over time."

### Segment 2: System Architecture & The 5-Step Longitudinal Pathway (02:00 - 04:00)
- **Visual:** Focus on the System Pathway diagram on the Overview page. Switch to Mermaid architectural diagram in documentation.
- **Talking Points:**
  - Ingestion from three modalities: manual clinician entry, calibrated file upload, and simulated wearable telemetry stream.
  - Core engine written in FastAPI and SQLAlchemy 2 with Pydantic v2 validation.
  - Mathematical engine: tri-axial ellipsoid volume ($V = \frac{\pi}{6} \cdot L \cdot W \cdot D$) and growth rate velocity ($\text{mm/month}$).
  - Immutable `TwinStateVersion` store: previous states are never overwritten.

### Segment 3: Patient Cohort Selection & Baseline Trajectories (04:00 - 06:30)
- **Visual:** Navigate to Patients directory (`/patients`). Search and select **Sofia Lindqvist (MRN-2026-290)**. Navigate to Observations (`/observations`).
- **Talking Points:**
  - Explain the 3 seeded cohorts: Elena Rostova (stable), Amara Okafor (gradual growth), Sofia Lindqvist (rapid expansion exceeding tolerance + missing depth).
  - Demonstrate the side-by-side observation comparison modal. Highlight $\Delta L = +1.3\text{ mm}$ and explicit assumption handling when depth is omitted ($D = W$).
  - Emphasize provenance badges (`MANUAL`, `DERIVED`, `SIMULATED`).

### Segment 4: Interactive 3D Digital Twin Visualizer (06:30 - 10:00)
- **Visual:** Digital Twin page (`/twin`).
- **Presenter Actions:**
  - Orbit, pan, and zoom around the 3D procedural uterus (fundus, body, cervix, fallopian tubes, ovaries).
  - Click **Side View**: Show 90° rotation.
  - Click **Cross-Section**: Show coronal clipping plane revealing endometrial cavity and intracavitary polyp attachment.
  - Scrub through the **Timeline Bar**: State v1 $\to$ State v2 $\to$ State v3. Watch the lesion mesh dynamically scale from persisted backend measurements.
  - Highlight the mandatory label: *"Illustrative anatomy — not a patient-specific reconstruction."*

### Segment 5: Ultrasound Imaging Lab & Caliper Annotations (10:00 - 12:30)
- **Visual:** Imaging Lab (`/imaging`).
- **Presenter Actions:**
  - Review procedural B-mode ultrasound scans watermarked: `SYNTHETIC — NOT A REAL SCAN`.
  - Draw a measurement line with the **Linear Caliper tool**.
  - Show normalized coordinates $(x, y \in [0, 1])$ saved to the backend database.
  - Toggle **Side-by-Side** comparison mode to inspect Day 0 vs Day 56 scans simultaneously.

### Segment 6: Proposed Wearable Simulator & Idempotent Stream Pipeline (12:30 - 14:30)
- **Visual:** Simulation Console (`/simulation`).
- **Presenter Script & Actions:**
  - Clarify wearable status: *"Continuous uterine ultrasound wearables are a proposed future concept. This console is a software stand-in."*
  - Enter test dimensions ($L = 11.0\text{ mm}$, $W = 7.5\text{ mm}$).
  - Click **Ingest Simulated Stream Event**: observe the pipeline atomically commit `TwinStateVersion 4`, trigger `CHANGE_EXCEEDS_TOLERANCE` alert, and emit audit event.
  - Demonstrate **Idempotency**: Click ingest again with the same key to prove the backend rejects duplicate inserts.

### Segment 7: Longitudinal Analytics & Transparent Baseline Forecast (14:30 - 16:30)
- **Visual:** Analytics page (`/analytics`).
- **Talking Points:**
  - Show Recharts multi-axis trajectory chart.
  - Point out the experimental ordinary least squares linear regression projection (dashed rose line) with a $95\%$ prediction interval band.
  - Review documented model assumptions: no training data fabrication, transparent linear baseline only.
  - Toggle the **Accessible Table Alternative** (WCAG AA compliance).

### Segment 8: Clinician Governance, Review Queue & PHI-Free Audit Trail (16:30 - 17:30)
- **Visual:** Clinical Review page (`/review`).
- **Presenter Actions:**
  - Change status to **Reviewed & Verified**.
  - Enter clinician verification note and save.
  - Inspect the Governance Audit Log on the right, confirming all entries contain zero patient names or personal identifiers.

### Segment 9: Dynamic PDF & HTML Clinical Report Export (17:30 - 18:30)
- **Visual:** Reports page (`/reports`).
- **Presenter Actions:**
  - Click **Download HTML Report** and display the rendered file in a new tab.
  - Click **Download PDF Report**, open the binary PDF generated via ReportLab, and point out the regulatory notice and complete serial observation table.

### Segment 10: Patient Mobile Portal & Educational Boundaries (18:30 - 19:30)
- **Visual:** Switch user to Elena Rostova (Patient). Navigate to Patient Portal (`/portal`).
- **Talking Points:**
  - Responsive, mobile-first patient dashboard.
  - Clear surveillance status, accessible size trend, and 3D view.
  - Educational section: *"What this can and cannot tell you"*—strictly avoiding reassuring "harmless/benign" claims.

### Segment 11: Summary, Future Hardware Requirements & Conclusion (19:30 - 20:00)
- **Visual:** Switch to Dark Theme via top bar toggle. Hard refresh browser to demonstrate instant theme persistence and database integrity.
- **Presenter Script:**
  - Summarize what was built: 13 modules, full SQLite/PostgreSQL backend, 3D digital twin, strict claims compliance.
  - State future engineering requirements: wearable piezoelectric array validation, clinical prospective trial data.
  - Closing acknowledgment for the Happiest Health Digital Twin Challenge 2026.
