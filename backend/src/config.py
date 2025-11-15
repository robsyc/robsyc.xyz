from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Any
from pydantic import BeforeValidator
from typing_extensions import Annotated

def parse_cors_origins(v: Any) -> list[str]:
    """Parse CORS origins from string or list."""
    if isinstance(v, str):
        if v == "*":
            return ["*"]
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    elif isinstance(v, list):
        return v
    return ["*"]


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )
    
    # Service metadata
    SERVICE_NAME: str = "backend"
    SERVICE_DESCRIPTION: str = "FastAPI backend of robsyc.xyz"
    SERVICE_VERSION: str = "1.0.0"
    
    # Server configuration
    LOG_LEVEL: str = "DEBUG"
    
    # API configuration
    API_PREFIX: str = ""
    
    # CORS configuration
    CORS_ORIGINS: Annotated[
        list[str], 
        BeforeValidator(parse_cors_origins)
    ] = ["*"]
    
    # External service configuration
    SPARQL_ENDPOINT: str
    SPARQL_PROVIDER: str = "tentris"      # "tentris" or "graphdb"
    SPARQL_REPOSITORY: str | None = None  # Required for GraphDB, e.g., "starwars"
    SPARQL_USERNAME: str | None = None
    SPARQL_PASSWORD: str | None = None
    SEARCH_ENDPOINT: str
    HTTP_TIMEOUT_SECONDS: float = 30.0


# Create settings instance
settings = Settings()