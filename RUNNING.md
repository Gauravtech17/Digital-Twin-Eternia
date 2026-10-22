# POLYPULSE — Running the Software Proof-of-Concept

This guide details how to install, seed, test, and run the **POLYPULSE — The Living Lesion Digital Twin** web application and backend services locally.

---

## 1. Prerequisites

- **Node.js**: v18+ (tested on Node v24.12.0)
- **Python**: v3.11+ (tested on Python 3.13.5)
- **PowerShell / Bash / Terminal**

---

## 2. Step-by-Step Local Setup

### Step A: Backend Setup & Virtual Environment

From the project root:

```bash
# Create and activate Python virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate

# macOS / Linux:
# source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Step B: Seed Demonstration Database

Initialize the SQLite database with 3 clinical demonstration patient cohorts and serial baseline observations:

```bash
python scripts/seed_data.py
```

### Step C: Frontend Setup

```bash
cd frontend
npm install
cd ..
```

---

## 3. Running the Applications

### Terminal 1: FastAPI Backend Service

```bash
# Windows PowerShell:
$env:PYTHONPATH = "backend"
cd backend
..\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# macOS / Linux:
# export PYTHONPATH="backend"
# cd backend
# ../venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

- **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **Health Check Endpoint**: [http://127.0.0.1:8001/api/v1/health](http://127.0.0.1:8001/api/v1/health)

### Terminal 2: React Vite Web Application

```bash
cd frontend
npm run dev
```

- **Web Application URL**: [http://localhost:5174](http://localhost:5174) (or [http://localhost:5173](http://localhost:5173))

---

## 4. Running the Automated Test Suites

Both test suites can be executed independently:

```bash
# 1. Frontend Vitest Suite (15 passing tests)
cd frontend
npm test -- --run

# 2. Backend Pytest Suite (11 passing tests)
cd backend
..\venv\Scripts\python -m pytest
```

---

## 5. Architectural Modules Overview

1. **Overview Dashboard (`/`)**: Displays selected patient cohort, device status ("READY FOR SIMULATION"), latest telemetry summary, and interactive 3D mini twin.
2. **Simulation Console (`/simulation`)**: 42-step spatial grid raster scanning simulation across `uterus.glb`, identifying an illustrative lesion target with live telemetry.
3. **Digital Twin Workstation (`/twin`)**: 3D interactive anatomical model with coronal cutaway, dynamic ellipsoid polyp scaling from persisted observations, and historical state scrubber.
4. **Observations Log (`/observations`)**: Longitudinal log with data provenance badges (`MEASURED`, `SIMULATED`, `DERIVED`, `ILLUSTRATIVE`) and side-by-side differential comparison tool.
