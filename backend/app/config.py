from typing import List, Union
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, ConfigDict
import json

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DB_FILE = (ROOT_DIR / "polypulse.db").as_posix()
UPLOADS_DIR = str(ROOT_DIR / "uploads")

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "POLYPULSE — The Living Lesion Digital Twin"
    API_V1_STR: str = "/api/v1"
    
    # Research prototype disclaimer (mandatory and non-negotiable)
    DISCLAIMER: str = (
        "POLYPULSE is a research prototype — not clinically validated — not a medical device. "
        "Provides no diagnosis, risk score, or treatment instructions."
    )
    
    # Database: Anchored to project root directory
    DATABASE_URL: str = f"sqlite:///{DB_FILE}"
    
    # Demo Security & JWT (Demonstration only, not production clinical security)
    SECRET_KEY: str = "polypulse-demo-secret-key-for-research-prototype-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Uploads
    UPLOAD_DIR: str = UPLOADS_DIR
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB
    
    # Default Demonstration Alert Thresholds (Documented as demonstration values, not clinical)
    DEFAULT_TOLERANCE_GROWTH_MM: float = 1.0
    DEFAULT_LOW_CONFIDENCE_THRESHOLD: float = 0.60
    DEFAULT_LOW_QUALITY_THRESHOLD: float = 0.50

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    model_config = ConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
