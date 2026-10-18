# POLYPULSE — System Architecture & Data Flow

*Happiest Health Digital Twin Challenge 2026*
*Research Prototype — Not Clinically Validated — Not a Medical Device*

---

## 1. System Overview

POLYPULSE is an end-to-end longitudinal digital twin application designed for the serial observation, dimensional analysis, spatial 3D visualization, and clinical governance of endometrial lesions (specifically uterine polyps).

The platform enforces strict computational integrity: numeric values are never fabricated in the presentation layer; every observation, measurement delta, and alert is derived from persisted database records.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph DataSources ["Data Sources & Ingestion"]
        DS1["Manual Clinical Entry\n(L, W, D mm, Confidence)"]
        DS2["Serial Scan Upload\n(PNG / JPEG + Calibration)"]
        DS3["Proposed Wearable Stream\n(Software Simulation Console)"]
    end

    subgraph BackendCore ["POLYPULSE Core Engine (FastAPI + SQLAlchemy 2)"]
        direction TB
        ING["Ingestion Pipeline & Schema Validation"]
        IDEM["Idempotency Engine\n(Unique SimulationEvent Key)"]
        MATH["Mathematical Engine\n• Tri-axial Ellipsoid Volume: V = (π/6)·L·W·D\n• Interval Growth Velocity: mm/month\n• Spatial Calibration: mm/pixel"]
        TWIN["Digital Twin Engine\n• Monotonic Immutable Versioning\n• Delta Longest Dimension\n• Procedural Uterine Placement"]
        ALERT["Alert Rule Engine\n• CHANGE_EXCEEDS_TOLERANCE\n• DATA_QUALITY_WARNING\n• NEW_OBSERVATION_RECEIVED\n• AWAITING_CLINICIAN_REVIEW"]
        AUDIT["Audit Logger\n(Structured logging, zero PHI)"]
        REP["Report Generator\n(ReportLab Binary PDF + HTML)"]
    end

    subgraph Persistence ["Persistence Layer"]
        DB[("Database\nSQLite (Local Dev) / PostgreSQL (Prod)\nSQLAlchemy 2 ORM")]
        UPLOADS["File Storage\n(Synthetic Scans & Uploads)"]
    end

    subgraph FrontendApp ["Frontend Application (React 19 + Vite + Tailwind CSS)"]
        SHELL["App Shell & Pre-Paint Theme Engine\n(Light Default, Dark Toggle, localStorage)"]
        T3D["3D Digital Twin Visualizer\n(React Three Fiber + drei + Three.js)"]
        LAB["Ultrasound Imaging Lab\n(SVG Caliper Annotations, Side-by-Side)"]
        CHART["Longitudinal Analytics\n(Recharts Multi-Axis Trends + OLS Forecast)"]
        REV["Clinician Review Queue & Sign-Off"]
        PAT["Responsive Patient Mobile Portal"]
    end

    DS1 --> ING
    DS2 --> ING
    DS3 --> IDEM --> ING
    ING --> MATH
    MATH --> TWIN
    TWIN --> ALERT
    TWIN --> AUDIT
    ALERT --> AUDIT

    TWIN --> DB
    ING --> DB
    ALERT --> DB
    AUDIT --> DB
    DS2 --> UPLOADS

    DB --> FrontendApp
    UPLOADS --> LAB
    DB --> REP
    REP --> FrontendApp
```

---

## 3. Data Class Classification & Provenance Tracking

POLYPULSE categorizes all information into four distinct data classes to prevent diagnostic misinterpretation:

| Data Class | Semantic Definition | Example Fields | Visual Identification |
| :--- | :--- | :--- | :--- |
| **OBSERVED** | Raw measured inputs directly captured via manual entry, file upload, or sensor stream. | `length_mm`, `width_mm`, `depth_mm`, `image_quality` | Blue Badge (`MANUAL`) or Amber Badge (`SIMULATED`) |
| **DERIVED** | Quantities computed exclusively via documented deterministic mathematical formulas. | `volume_mm3`, `growth_rate_mm_per_month`, `delta_length_mm` | Purple Badge (`DERIVED`) |
| **ILLUSTRATIVE** | Procedural 3D anatomical meshes rendered for spatial context; not patient-specific reconstructions. | Fundus, cervix, fallopian tubes, endometrial cavity | Slate Badge (`ILLUSTRATIVE`) + Mandatory Notice |
| **PREDICTION** | Experimental transparent statistical baselines with confidence intervals. | 30/60/90-day linear projections and uncertainty bounds | Rose Dashed Badge (`PREDICTED`) |

---

## 4. Processing Pipeline Execution Sequence

For every new serial observation (manual or simulated stream):

1. **Request Validation:** Validates schema bounds ($L > 0$, $W > 0$, $0.0 \le \text{confidence} \le 1.0$) and verifies patient existence.
2. **Idempotency Guard:** For simulated stream events, checks `SimulationEvent.idempotency_key`. Duplicate requests return the original committed state without creating duplicate records.
3. **Derived Computations:**
   - Evaluates ellipsoid volume: $V = \frac{\pi}{6} \cdot L \cdot W \cdot D$. If $D$ is missing, evaluates explicit assumption flag ($D = W$).
   - If $\ge 2$ observations exist, calculates interval growth rate: $\text{Rate} = \frac{L_{\text{current}} - L_{\text{previous}}}{\Delta t_{\text{days}}} \times 30.4375$ mm/month.
4. **Immutable Twin State Versioning:** Creates a new, monotonically incremented `TwinStateVersion` linked to its parent version. Existing versions are never modified or overwritten.
5. **Alert Rule Evaluation:**
   - Evaluates whether $\Delta L \ge \text{tolerance\_growth\_mm}$ (default: $1.0\text{ mm}$, demonstration threshold).
   - Checks confidence and quality thresholds.
   - Generates in-app alert records with trigger rules and explanations.
6. **Clinical Review Queue:** Appends a `PENDING` review record for clinician sign-off.
7. **Audit Logging:** Emits structured audit event recording timestamp, entity ID, and event type with patient-identifying data strictly scrubbed.
8. **Consistent Transaction Commit:** Atomic commit ensures either all artifacts persist or the database rolls back entirely.

---

## 5. Security & Demo Role-Based Access Control (RBAC)

- **Demonstration Security Notice:** Authentication utilizes JSON Web Tokens (JWT) signed with HMAC-SHA256. Intended for demonstration role isolation, not production HIPAA-certified clinical deployment.
- **Roles:**
  - `CLINICIAN`: Full cohort access, clinical review sign-off, patient creation.
  - `PATIENT`: Strictly restricted to their own linked medical record and non-diagnostic educational view.
  - `ADMIN`: System configuration, threshold customization, global audit review.
