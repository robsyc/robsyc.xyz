import logging
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)

# Global HTTP client instance
_http_client: Optional[httpx.AsyncClient] = None


async def initialize_http_client() -> None:
    """Initialize the HTTP client."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS)
        logger.info("HTTP client initialized")


async def cleanup_http_client() -> None:
    """Cleanup the HTTP client."""
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None
        logger.info("HTTP client closed")


async def get_http_client() -> httpx.AsyncClient:
    """Dependency to get the HTTP client instance."""
    if _http_client is None:
        raise RuntimeError("HTTP client not initialized.")
    return _http_client
