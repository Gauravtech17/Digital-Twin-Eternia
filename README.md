## Team Details

| | |
|---|---|
| **Team name** | Eternia |
| **Project** | POLYPULSE — The Living Lesion Digital Twin |

| Team Members |
|---|
| Priyanshi Rathore |
| Yash Kumar Khatik |
| Ishan Khan |
| Gaurav Shah |

## College / Incubator Information

| | |
|---|---|
| **Institution** | Parul Institute of Engineering and Technology, Parul University, Vadodara |

## Project Title

# POLYPULSE — The Living Lesion Digital Twin

*A wearable abdominal ultrasound system with AI-assisted imaging and 3D digital-twin visualisation for longitudinal tracking of endometrial polyp observations.*

> **Note:** POLYPULSE is a **concept-stage wearable hardware project supported by a software prototype**. It is **not** a clinically validated medical device, and no diagnostic performance is claimed. See [Disclaimer and Limitations](#disclaimer-and-limitations).

### Project Overview

POLYPULSE proposes a wearable ultrasound device, a connected application and a 3D digital-twin platform for the **longitudinal tracking of endometrial polyp observations**. It explores how ultrasound image acquisition, AI-assisted analysis and anatomical visualisation could be brought together in one workflow, so that observations from different assessment dates can be organised and compared.

**Project objectives**

- Investigate the technical feasibility of acquiring uterine ultrasound images with a wearable device positioned on the abdomen.
- Develop an imaging-to-visualisation workflow covering acquisition, transfer, processing and visualisation.
- Explore AI-assisted analysis (segmentation, measurement estimation) to support longitudinal tracking.
- Present observations to clinicians in a structured, visual and comparable form.

The system's imaging performance, diagnostic utility and suitability for clinical use require further engineering development and appropriate clinical validation.

## Problem Statement

Endometrial polyps are growths in the uterine lining that may need clinical assessment and follow-up, depending on symptoms, medical history and the treating clinician's judgement. Follow-up can involve ultrasound imaging, clinical observations and measurements collected at different examinations.

| Challenge | Description |
|---|---|
| **Fragmented information** | Ultrasound images, measurements and reports are collected at different times and stored separately. |
| **Difficult comparison** | Changes in polyp size, shape and morphology across assessments are hard to track and compare. |
| **Need for better organisation** | A structured, visual approach could support more informed longitudinal review. |
| **Equipment constraints** | Conventional ultrasound equipment is designed for examination sessions. Whether clinically useful uterine images can be acquired through an abdominal wearable has yet to be established. |

## Healthcare Use Case

POLYPULSE explores how ultrasound imaging, AI-assisted analysis and anatomical visualisation could support the **organisation and comparison of observations across clinically indicated follow-up assessments** of endometrial polyps.

| # | Application | Description |
|:---:|---|---|
| 1 | **Post-treatment follow-up** | Explore wearable ultrasound for acquiring imaging data during follow-up after polyp treatment, when appropriate in the treating clinician's judgement. |
| 2 | **Wearable abdominal imaging** | Investigate whether a device against the abdomen can acquire uterine images of sufficient quality for the intended application. |
| 3 | **Connected imaging and data management** | Transfer imaging data to an application for organised storage, review and association with assessment dates. |
| 4 | **AI-assisted analysis and 3D visualisation** | Explore segmentation, measurement estimation and 3D visualisation to present observations clearly. |
| 5 | **Longitudinal observation tracking** | Organise observations from different assessments so clinicians can review documented changes over time. |

**Intended beneficiaries:** gynaecologists and clinical teams; hospitals and diagnostic centres; patients undergoing clinically indicated follow-up assessments.

**Clinical limitation:** POLYPULSE is currently a concept-stage wearable hardware project supported by a software prototype. The ability to acquire clinically useful uterine images through an abdominal wearable, identify endometrial polyps, and support clinical decision-making has not yet been established. These capabilities require technical development and appropriate clinical validation.

### Proposed Solution

POLYPULSE combines wearable ultrasound hardware with a connected application and a 3D digital-twin platform.

| Step | Component | Role |
|:---:|---|---|
| 1 | **Wearable ultrasound device** *(proposed)* | Captures ultrasound images through a portable, abdominal wearable system. |
| 2 | **Connected application** | Transfers, stores and organises imaging data in a unified interface. |
| 3 | **AI-assisted analysis and 3D reconstruction** *(proposed)* | Analyses images and builds an exploratory 3D representation of the uterine anatomy with the polyp. |
| 4 | **Longitudinal tracking** | Compares observations across assessment dates to review changes in polyp size and morphology. |

### Key Features

| Feature | Status |
|---|---|
| Scan upload, metadata handling and organised storage by assessment date | Planned architecture |
| AI-assisted polyp segmentation | Proposed |
| Measurement estimation (size, shape, volume) | Proposed |
| 3D digital-twin visualisation | Proposed (software visualisation stack in prototype; see [Current Implementation Status](#current-implementation-status)) |
| Timeline comparison and trend charts across assessments | Proposed |
| Clinician dashboard with patient-wise reports | Proposed |
| Alerts for significant changes, subject to validation | Proposed |
| Wearable abdominal ultrasound hardware | Proposed |

### Innovation and Differentiation

| Aspect | Description |
|---|---|
| **Wearable ultrasound concept** | Explores regular uterine imaging outside examination-room equipment, subject to feasibility testing. |
| **AI-assisted analysis** | Proposes automated assessment of polyp size and morphology from ultrasound images. |
| **3D digital twin** | Proposes a patient-specific 3D model for visualisation and comparison over time. |
| **Unified longitudinal workflow** | Brings acquisition, storage, analysis and visualisation into one connected system. |
| **Patient-centric design intent** | Designed to be comfortable and suitable for repeated use, subject to hardware development. |

### Impact and Future Potential

| Direction | Description |
|---|---|
| **Clinical validation and adoption** | Multi-centre studies to evaluate accuracy, reliability and real-world usability. |
| **Expanded indications** | Possible extension to other gynaecological conditions such as fibroids, cysts and adenomyosis. |
| **Care-ecosystem integration** | Links with telemedicine platforms, EHR systems and clinical decision-support tools. |
| **Scalable impact** | Potential to support larger-scale, long-term reproductive-health monitoring. |

These are future directions and are not claims of current capability.

### Disclaimer and Limitations

- POLYPULSE is currently a **concept-stage wearable hardware project supported by a software prototype**.
- It is **not** a clinically validated medical device and has not been evaluated for diagnostic use.
- Whether clinically useful uterine images can be acquired through an abdominal wearable, whether endometrial polyps can be identified, and whether the system can support clinical decision-making have **not been established**.
- AI/ML models are **proposed** and have not been trained, deployed or validated. No accuracy or performance metrics are reported.
- Any 3D representation is exploratory; a clinically meaningful 3D model cannot be assumed to be recoverable from a single 2D ultrasound image.
- Alerts and risk indicators must not be treated as diagnoses or used to direct care until appropriately validated.
- Illustrative dates, images and values shown in the presentation materials are mock-ups, not real patient data.

## Technical Stack

The final implemented stack must be confirmed against the repository and deployment configuration.

### Software

| Area | Technology | Status |
|---|---|---|
| Frontend | React, Vite, TypeScript | Listed in project stack |
| UI styling | Tailwind CSS | Listed in project stack |
| 3D visualisation | Three.js, React Three Fiber | Listed in project stack |
| Charts and analytics | Recharts | Listed in project stack |
| Backend and APIs | Python, FastAPI | Listed in project stack |
| Image processing | OpenCV, NumPy | Listed in project stack |
| AI / machine learning | PyTorch | **Proposed** |
| Medical-imaging DL utilities | MONAI | **Under evaluation** |
| Database | PostgreSQL | **Planned**, subject to verification |
| Data storage | Local or cloud storage | Subject to implementation |
| Deployment | Vercel / cloud platform | Depends on deployment configuration |
| Development tools | VS Code, Git, GitHub | In use |

### Proposed Hardware

The hardware is at concept stage. Component selection and feasibility testing are pending.

| Component | Purpose | Status |
|---|---|---|
| Ultrasound transducer | Acquire uterine ultrasound images | Selection and feasibility testing pending |
| Imaging electronics | Ultrasound signal acquisition and image generation | Proposed |
| Embedded processor | Device control and data handling | Selection pending |
| Communication module | USB, Wi-Fi or Bluetooth | Final interface to be decided |
| Power management | Battery, charging, regulated power supply | Proposed |
| Wearable enclosure | Attachment, comfort, acoustic coupling, safe operation | Proposed |
| Safety and control | Temperature monitoring, electrical protection, ultrasound output controls | Proposed |

### Current Implementation Status

| Status | Scope |
|---|---|
| **Currently implemented** | A **software proof of concept** exists. *Detailed list of working screens and features: to be added from the repository.* |
| **In development** | *No feature is explicitly marked in-development in the supplied materials. To be completed by the team.* |
| **Proposed / future scope** | Wearable ultrasound hardware · hardware–application data transfer · AI-assisted segmentation · measurement estimation · 3D reconstruction from clinical ultrasound data · predictive analytics · risk alerts · EHR and teleconsultation integration · clinical validation and regulatory pathway |

Hardware integration, automated analysis, 3D reconstruction from clinical ultrasound data, risk alerts and clinical utility all require further development and appropriate validation.

## AI/ML Model or Framework Details

The models and frameworks below are **proposed for development and evaluation**. None is represented as trained, deployed or clinically validated.

### Frameworks

| Framework | Intended role |
|---|---|
| **PyTorch** | Proposed deep-learning framework for training, experimentation and inference |
| **OpenCV** | Image loading, preprocessing, noise handling and image-processing operations |
| **NumPy** | Numerical operations and manipulation of image arrays |
| **MONAI** *(under evaluation)* | Medical-imaging utilities for preprocessing, segmentation workflows and evaluation |
| **Three.js / React Three Fiber** | Frontend rendering of the 3D visualisation (visualisation frameworks, not AI models) |

### Proposed Models and Methods

| Capability | Candidate approach | Intended purpose | Status |
|---|---|---|---|
| **Segmentation** | U-Net | Segment the suspected polyp region in suitable ultrasound images, trained on expert-annotated masks | Proposed. Needs labelled data, training and evaluation |
| **Classification** | ResNet-50 or EfficientNet | Explore image-feature classification in a research setting, producing experimental class probabilities | Optional research direction; not a validated diagnostic model |
| **Measurement estimation** | Derive size and shape from segmented regions, given calibration and acquisition metadata | Support comparison across assessment dates | Proposed. Must be compared with clinician-verified measurements |
| **3D reconstruction** | Geometry and surface modelling from suitable image data (Python scientific/3D tools; Three.js for rendering) | Exploratory 3D representation for visual comparison | Proposed. A clinically meaningful 3D model cannot be assumed to be recoverable from a single 2D ultrasound image |
| **Longitudinal trend analysis** | Time-series visualisation and statistical trend analysis | Highlight changes for clinician review | Trend visualisation can be developed independently of any risk-prediction model; predictive modelling only if sufficient representative data becomes available |

### Proposed AI/ML Workflow

1. Collect appropriately governed ultrasound datasets and expert annotations.
2. Preprocess images and assess image quality.
3. Train and evaluate candidate segmentation models.
4. Estimate measurements and quantify uncertainty.
5. Explore 3D reconstruction using suitable image data.
6. Compare observations longitudinally.
7. Present outputs for clinician review, with limitations clearly displayed.

### Planned Evaluation Metrics

| Task | Metrics |
|---|---|
| Segmentation | Dice coefficient, IoU, sensitivity, precision |
| Measurement | Mean absolute error against reference measurements |
| Classification (if pursued) | Sensitivity, specificity, precision, recall, ROC-AUC |
| 3D reconstruction | Geometric consistency and agreement with an appropriate reference |
| Generalisation | Performance across devices, sites and patient populations |

**Recommended initial direction:** build a U-Net segmentation baseline using PyTorch or MONAI, with OpenCV preprocessing and expert-annotated ultrasound images. Evaluate segmentation before attempting measurement estimation, 3D reconstruction or predictive risk modelling.

**Requirements before any capability can be claimed:** suitable ultrasound data, expert annotations, patient-data governance, reproducible testing and independent clinical evaluation. Risk alerts must not be treated as diagnoses or used to direct care until appropriately validated.

## Presentation Video

[Demo Video] https://drive.google.com/file/d/1-1sRnUTbnWUIyBHvsxJPmPoKTX94eHZL/view?usp=sharing

## Open-Source Licence Details

### Third-Party Software

POLYPULSE uses, or proposes to use, established open-source technologies for application development, image processing, numerical computation and 3D visualisation. These are governed by their respective licences, including MIT, Apache-2.0 and BSD-family licences.

- Third-party copyright notices and licence records will be maintained.
- The final dependency list and licence versions will be verified against the implemented software before release.

### POLYPULSE Original Software

The licensing model for original POLYPULSE software has not yet been determined. It will be decided separately, considering intellectual-property protection, future commercialisation and institutional or competition requirements.

## Architecture Diagram

**System architecture diagram (PDF):**  [[Architecture_diagram_PDF](<Architecture diagram PolyPluse.pdf>)](https://drive.google.com/file/d/152CNvmthTjRx2s-SD-sohh_TYeoc9dk4/view?usp=sharing)

The architecture is organised into three layers. All components below describe the **proposed** design unless stated otherwise in [Current Implementation Status](#current-implementation-status).

| Layer | Components |
|---|---|
| **1. User interface and data input** | Wearable ultrasound device *(proposed)* · patient web/mobile app · AI processing and 3D reconstruction · patient dashboard |
| **2. Backend and core services** | Data ingestion (upload, metadata validation) · AI and image-processing engine · database and model storage (longitudinal records, versioned 3D models) · application server and REST APIs (FastAPI) · doctor dashboard with reports and proposed alerts |
| **3. Future integrations** | EHR integration · advanced AI analytics · multi-centre data and research · teleconsultation · regulatory pathway and scalable deployment |

The architecture also envisages secure (HTTPS) upload, de-identification and encryption of stored scans, user authentication with role management, and audit logs. These are **design intentions**, not confirmed implementations.

### How the System Works

1. **Capture:** the wearable device acquires ultrasound images at regular intervals *(proposed)*.
2. **Transfer:** images and metadata are transferred to the application and stored by assessment date.
3. **Process:** images are preprocessed, and AI-assisted segmentation and measurement estimation are applied *(proposed)*.
4. **Reconstruct:** suitable image data is used to build an exploratory 3D representation *(proposed)*.
5. **Track:** observations and measurements from different dates are compared through timelines and trend charts.
6. **Review:** outputs are presented to the clinician for review, with limitations displayed. Alerts are proposed and subject to technical and clinical validation.

### Data Flow and Processing Pipeline

Scan images, device metadata and timestamp → ingestion and validation → preprocessing (noise handling, quality check) → segmentation *(proposed)* → measurement estimation *(proposed)* and 3D reconstruction *(proposed)* → longitudinal records per assessment date → trend comparison (timeline and charts) → clinician dashboard (reports, proposed alerts).

The pipeline is intended to support scan uploads, metadata handling, image processing, structured observation records, storage of generated outputs, and communication between the application and backend services. Future integrations may include wearable-device data transfer, electronic health records (EHRs) and teleconsultation platforms.

## Presentation

**Project presentation (PDF):** [[PolyPulse.pdf](PolyPulse.pdf) https://drive.google.com/file/d/1h_RolVe2KlTiM7ZI6wHJjrmd7oFvjrpO/view?usp=sharing](https://drive.google.com/file/d/1h_RolVe2KlTiM7ZI6wHJjrmd7oFvjrpO/view?usp=sharing)

## Public Accessibility of Files and Links

Public accessibility of the files and links are below.

| Resource | Location | Status |
|---|---|---|
| Presentation video (unlisted YouTube) | [Demo Video](https://drive.google.com/file/d/1lidnOrEiIqOkvcEANlxQwEP5bjhyhpIy/view?usp=sharing)|
| Architecture diagram (PDF) | `Architecture_diagram_PolyPluse.pdf` |
| Presentation (PDF) | `PolyPulse.pdf` |
