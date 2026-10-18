# POLYPULSE — Reproducible Demo Walkthrough Script

*Happiest Health Digital Twin Challenge 2026*
*Research Prototype — Not Clinically Validated — Not a Medical Device*

---

## 1. Prerequisites & Environment Setup

Ensure both backend and frontend servers are running:

### Terminal 1: Backend Server
```powershell
cd C:\Users\admin\.gemini\antigravity\scratch\polypulse\backend
..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health check:* [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### Terminal 2: Frontend Server
```powershell
cd C:\Users\admin\.gemini\antigravity\scratch\polypulse\frontend
npm run dev
```
*Application URL:* [http://localhost:5173](http://localhost:5173)

---

## 2. Step-by-Step Primary Verification Workflow

### Step 1: Initial Visit & Default Theme Verification
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. **Verify Theme:** Confirm that the application opens in a **polished WHITE (Light) theme** with violet accents (#8B5CF6) and clean charcoal type (#24212D).
3. **Verify Regulatory Banner:** Observe the persistent banner at the top:
   > *"Research prototype — not clinically validated — not a medical device. Provides no diagnosis, malignancy probability, or treatment instructions."*
4. Confirm the System Pathway diagram renders the 5-step flow from proposed wearable concept to versioned twin.

### Step 2: Patient Selection & Serial Observation Log
1. Click the patient dropdown in the top bar (defaults to **Elena Rostova, MRN-2026-081**).
2. Switch to **Sofia Lindqvist (MRN-2026-290)** to view a patient with active rapid change.
3. Navigate to **Observations** (`/observations`) in the sidebar.
4. Verify:
   - Observation list displays dates, sources, and dimensions.
   - Longest dimension shows $+1.3\text{ mm}$ change between Day 0 and Day 28.
   - Ellipsoid volume is computed with explicit assumption note *(Depth assumed $D = W$)*.
   - Provenance badges accurately label data origins.
5. Click **Compare Scans** and observe side-by-side delta metrics: $\Delta L = +1.3\text{ mm}$, volume delta, and calculated growth velocity ($+1.41\text{ mm/mo}$).

### Step 3: Interactive 3D Digital Twin Visualizer
1. Navigate to **Digital Twin** (`/twin`) in the sidebar.
2. Confirm the 3D scene renders:
   - Procedural illustrative uterus (fundus, body, tapered cervix, fallopian tubes, ovaries).
   - A separate, distinct lesion mesh positioned at the endometrial wall and scaled to Sofia's latest state ($10.1\text{ mm}$).
3. **Test Camera Views:**
   - Click **Side View**: Camera smoothly rotates 90° to sagittal orientation.
   - Click **Cross-Section**: Activates internal clipping plane, slicing open the uterine cavity to reveal cavity walls and the polyp attachment stalk.
   - Test mouse orbit, zoom, and pan controls.
   - Click **Reset View**: Restores front coronal orientation.
4. **Test Historical Timeline:**
   - Click **State v1 (Jun 1)**: Lesion smoothly scales down to baseline $7.2\text{ mm}$.
   - Click **State v2 (Jun 29)**: Scales to $8.5\text{ mm}$.
   - Click **State v3 (Jul 27)**: Scales up to $10.1\text{ mm}$.
   - Telemetry card dynamically updates dimensions and delta notes.

### Step 4: Ultrasound Imaging Lab & Caliper Annotations
1. Navigate to **Imaging Lab** (`/imaging`).
2. Observe the gallery of serial synthetic ultrasound scans, each visibly watermarked:
   `SYNTHETIC — NOT A REAL SCAN — DEMO RESEARCH PROTOTYPE`.
3. Select **Linear Caliper (Line)**:
   - Click and drag across the lesion on the canvas.
   - An SVG caliper line with crosshairs and measurement distance ($mm$ or $px$) appears and automatically persists to the backend database.
4. Toggle **Side-by-Side**: Compare baseline Day 0 vs Day 56 scans simultaneously.

### Step 5: Simulation Console & Idempotent Stream Ingestion
1. Navigate to **Simulation Console** (`/simulation`).
2. Note the clear label: *"Software simulation of a future imaging source"*.
3. Change Length to `11.0`, Width to `7.5`, Depth to `7.0`.
4. Click **Ingest Simulated Stream Event**:
   - The engine validates parameters, derives volume, creates `TwinStateVersion 4`, evaluates alert rules, writes audit events, and returns updated state.
   - Observe response: New version v4 generated, alerts listed.
5. **Test Idempotency:**
   - Without changing the idempotency key, click **Ingest Simulated Stream Event** again.
   - Status returns `DUPLICATE_IDEMPOTENT_IGNORED`: proves the backend protected against duplicate observation insertion.

### Step 6: Verify Longitudinal Updates & Alerts
1. Navigate to **Analytics** (`/analytics`).
   - Confirm the new observation point is rendered on the trajectory.
   - Observe the experimental linear trend baseline (dashed rose line) projecting 30/60/90 days into the future with a shaded $95\%$ prediction interval band.
2. Navigate to **Alerts** (`/alerts`).
   - Confirm `CHANGE_EXCEEDS_TOLERANCE` alert is generated.
   - Click **Acknowledge**: changes alert status to verified with user timestamp.

### Step 7: Clinical Review Sign-Off & Audit History
1. Navigate to **Clinical Review** (`/review`).
2. Select status **Reviewed & Verified**.
3. Enter review note: *"Serial expansion exceeds configured tolerance threshold. Discussed conservative hysteroscopic resection options with patient."*
4. Click **Submit Clinical Sign-Off**.
5. Observe the Governance Audit Log on the right update with the new audit event.

### Step 8: Dynamic PDF and HTML Report Export
1. Navigate to **Reports** (`/reports`).
2. Click **Download HTML**: Opens a formatted, self-contained HTML clinical summary report with regulatory notices and formulas.
3. Click **Download PDF Report**: Generates an authentic binary PDF file compiled dynamically via ReportLab from database records. Open the PDF to verify disclaimer and tables.

### Step 9: Patient Portal (Mobile View)
1. Switch demo user to **Elena Rostova (Patient)** via the top bar user switcher.
2. Navigate to **Patient Portal** (`/portal`).
3. Note the responsive, mobile-first design:
   - Displays Elena's own stable record.
   - Clean size-trend chart and 3D twin shortcut.
   - Plain-language section: *"What this can and cannot tell you"* (no diagnosis, no false reassurance).

### Step 10: Persistence & Theme Switch Verification
1. Toggle the theme switch in the top bar to **Dark Theme**.
   - Notice the high-contrast research slate theme across all cards, charts, and 3D canvas background.
2. **Hard Refresh the Browser (F5 / Ctrl+R):**
   - Confirm the page reloads instantly in dark mode with **zero white flash**.
   - Confirm all newly created observations, twin versions, and review notes remain intact in SQLite.
3. Toggle back to **Light Theme** (default) to confirm reversible theme persistence.
