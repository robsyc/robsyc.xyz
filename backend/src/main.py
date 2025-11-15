import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from deps import initialize_dependencies, cleanup_dependencies

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifespan event handler for FastAPI application.
    Handles startup and shutdown events.
    """
    logger.info(f"Starting {settings.SERVICE_NAME}")
    try:
        await initialize_dependencies()
        logger.info(f"{settings.SERVICE_NAME} startup completed successfully")
    except Exception as e:
        logger.error(f"Failed to initialize {settings.SERVICE_NAME}: {e}")
        raise
    
    yield
    
    logger.info(f"Shutting down {settings.SERVICE_NAME}")
    try:
        await cleanup_dependencies()
        logger.info(f"{settings.SERVICE_NAME} shutdown completed successfully")
    except Exception as e:
        logger.error(f"Error during {settings.SERVICE_NAME} shutdown: {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.SERVICE_NAME,
    description=settings.SERVICE_DESCRIPTION,
    version=settings.SERVICE_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from api.routers import sparql_router, blog_router

app.include_router(
    sparql_router, 
    prefix=settings.API_PREFIX + "", 
    tags=["sparql"]
)

app.include_router(
    blog_router,
    prefix=settings.API_PREFIX + "/blog",
    tags=["blog"]
)

# Basic endpoints
@app.get("/")
async def root() -> dict:
    return {
        "service": settings.SERVICE_NAME, 
        "description": settings.SERVICE_DESCRIPTION,
        "version": settings.SERVICE_VERSION,
    }

@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy"}

@app.get("/debug")
async def debug_info() -> dict:
    return settings.model_dump()