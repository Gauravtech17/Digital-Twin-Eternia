import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routers import (
    health,
    auth,
    patients,
    observations,
    twin,
    imaging,
    analytics,
    alerts,
    reviews,
    reports,
    settings as app_settings,
    simulation,
)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

# Ensure upload directory exists
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "POLYPULSE — The Living Lesion Digital Twin (Research Prototype).\n\n"
        "**MANDATORY CLAIMS NOTICE:** This software is an academic research prototype. "
        "It is NOT clinically validated, NOT a medical device, and gives NO diagnosis or treatment advice. "
        "Continuous ultrasound wearables are a PROPOSED FUTURE CONCEPT simulated via software."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": str(exc),
            "path": request.url.path,
            "disclaimer": settings.DISCLAIMER,
        },
    )


# Include API Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(health.router, prefix=api_v1_prefix)
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(patients.router, prefix=api_v1_prefix)
app.include_router(observations.router, prefix=api_v1_prefix)
app.include_router(twin.router, prefix=api_v1_prefix)
app.include_router(imaging.router, prefix=api_v1_prefix)
app.include_router(analytics.router, prefix=api_v1_prefix)
app.include_router(alerts.router, prefix=api_v1_prefix)
app.include_router(reviews.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(app_settings.router, prefix=api_v1_prefix)
app.include_router(simulation.router, prefix=api_v1_prefix)


@app.get("/")
def root():
    return {
        "message": "Welcome to POLYPULSE API",
        "documentation": "/docs",
        "health": f"{api_v1_prefix}/health",
        "research_notice": settings.DISCLAIMER,
    }
