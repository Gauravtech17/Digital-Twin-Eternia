# SYNTHETIC DATA SPECIFICATION & PROVENANCE

*POLYPULSE — Happiest Health Digital Twin Challenge 2026*
*Research Prototype — Not Clinically Validated — Not a Medical Device*

---

## 1. Provenance Statement & Privacy Notice

**Zero Protected Health Information (PHI):**
All patient records, medical record numbers (MRNs), observation dates, measurements, and ultrasound scan images in POLYPULSE are **100% fictional, synthetically generated, and deterministic**. No real patient data, clinical health records, or proprietary hospital datasets were used or cited.

---

## 2. Fictional Patient Trajectories

To demonstrate longitudinal digital twin behavior across diverse clinical surveillance scenarios, the deterministic seed script (`scripts/seed_data.py`) generates three distinct patient cohorts:

### Cohort Patient 1: Elena Rostova (Stable Trajectory)
- **MRN:** `MRN-2026-081`
- **Demographics:** Age 32 (DOB 1994-05-12), Biological Sex: Female
- **Clinical Scenario:** Asymptomatic solitary endometrial polyp enrolled in serial observational monitoring.
- **Longitudinal Dynamics:**
  - Day 0 (Manual Intake): $8.0 \times 6.0 \times 5.8\text{ mm}$ ($V \approx 145.9\text{ mm}^3$), Confidence: $92\%$, Quality: $88\%$.
  - Day 30 (Simulated Stream): $8.1 \times 6.1 \times 5.9\text{ mm}$ ($V \approx 152.6\text{ mm}^3$, $+0.10\text{ mm/mo}$), Confidence: $89\%$.
  - Day 60 (File Upload): $8.2 \times 6.0 \times 5.8\text{ mm}$ ($V \approx 149.5\text{ mm}^3$, $+0.10\text{ mm/mo}$), Confidence: $90\%$.
  - Day 90 (Simulated Stream): $8.1 \times 6.1 \times 5.9\text{ mm}$ ($V \approx 152.6\text{ mm}^3$, $-0.10\text{ mm/mo}$), Confidence: $91\%$.
- **Alert Status:** Stable; within configured demonstration tolerance ($1.0\text{ mm}$). All alerts are informational (`NEW_OBSERVATION_RECEIVED`).

### Cohort Patient 2: Amara Okafor (Gradual Growth Trajectory)
- **MRN:** `MRN-2026-144`
- **Demographics:** Age 36 (DOB 1989-11-23), Biological Sex: Female
- **Clinical Scenario:** Mild abnormal uterine bleeding under periodic surveillance.
- **Longitudinal Dynamics:**
  - Day 0: $6.5 \times 4.8 \times 4.6\text{ mm}$ ($V \approx 75.1\text{ mm}^3$).
  - Day 35: $7.0 \times 5.1 \times 4.9\text{ mm}$ ($V \approx 91.6\text{ mm}^3$, $+0.43\text{ mm/mo}$).
  - Day 70: $7.5 \times 5.5 \times 5.2\text{ mm}$ ($V \approx 112.5\text{ mm}^3$, $+0.43\text{ mm/mo}$).
  - Day 105: $8.0 \times 5.9 \times 5.6\text{ mm}$ ($V \approx 138.4\text{ mm}^3$, $+0.43\text{ mm/mo}$).
- **Alert Status:** Monitored gradual expansion; queued for clinical review.

### Cohort Patient 3: Sofia Lindqvist (High Growth & Data Quality Case)
- **MRN:** `MRN-2026-290`
- **Demographics:** Age 34 (DOB 1992-03-08), Biological Sex: Female
- **Clinical Scenario:** Rapid serial expansion exceeding demonstration threshold, coupled with sub-optimal image acquisition.
- **Longitudinal Dynamics:**
  - Day 0: $7.2 \times 5.0 \times 4.8\text{ mm}$ ($V \approx 90.5\text{ mm}^3$).
  - Day 28: $8.5 \times 5.8\text{ mm}$ (Depth **omitted**; explicit assumption $D = W$ evaluated; $\Delta L = +1.3\text{ mm} \ge 1.0\text{ mm}$ tolerance threshold). Low confidence ($0.55$) and low image quality ($0.48$).
  - Day 56: $10.1 \times 7.2 \times 6.9\text{ mm}$ ($V \approx 263.0\text{ mm}^3$, $\Delta L = +1.6\text{ mm}$).
- **Alerts Triggered:**
  - `CHANGE_EXCEEDS_TOLERANCE` (Delta $\ge 1.0\text{ mm}$)
  - `DATA_QUALITY_WARNING` (Confidence $< 0.60$, Quality $< 0.50$, missing depth)
  - `AWAITING_CLINICIAN_REVIEW`

---

## 3. Procedural Ultrasound Synthesis Model

Synthetic ultrasound scans are rendered procedurally using Python (`Pillow`) in `app/services/synthetic_imaging.py`:

1. **Sector Scan Geometry:** Simulates an acoustic fan beam propagating from an apex with depth-dependent tissue attenuation ($I(y) = I_0 \cdot e^{-\alpha y}$).
2. **Speckle Noise Modeling:** Rayleigh-distributed acoustic speckle interference simulated across myometrial and endometrial tissue boundaries.
3. **Endometrial Cavity & Polyp Echogenicity:** Renders hyperechoic cavity margin with an intracavitary polyp lesion scaled to the exact physical millimeter dimensions of the associated observation.
4. **Mandatory Visible Watermark:** Every procedurally generated ultrasound scan is stamped with a permanent, bold banner:
   ```
   SYNTHETIC — NOT A REAL SCAN — DEMO RESEARCH PROTOTYPE
   ```
   Preventing any accidental confusion with diagnostic clinical scans.
5. **Spatial Calibration Bar:** Stamped with a calibrated $10\text{ mm}$ scale bar computed via the scan's physical calibration factor ($mm/\text{pixel}$).
