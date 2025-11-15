import logging
from fastapi import Depends

from .http_client import (
    initialize_http_client,
    cleanup_http_client,
    get_http_client
)
from .sparql_service import (
    SparqlService,
    initialize_sparql_service,
    cleanup_sparql_service,
    get_sparql_service
)
# from .sparql_templater import (
#     SPARQLTemplater,
#     initialize_sparql_templater,
#     cleanup_sparql_templater,
#     get_sparql_templater
# )


logger = logging.getLogger(__name__)


# Type aliases for dependency injection
HttpClientDep = Depends(get_http_client)
SparqlServiceDep = Depends(get_sparql_service)
# SparqlTemplaterDep = Depends(get_sparql_templater)

# Lifecycle management functions for application startup/shutdown
async def initialize_dependencies() -> None:
    """Initialize all dependencies during application startup."""
    await initialize_http_client()
    await initialize_sparql_service()
    # await initialize_sparql_templater()
    logger.info("All dependencies initialized successfully")


async def cleanup_dependencies() -> None:
    """Cleanup all dependencies during application shutdown."""
    await cleanup_sparql_service()
    # await cleanup_sparql_templater()
    await cleanup_http_client()
    logger.info("All dependencies cleaned up successfully")


__all__ = [
    "initialize_dependencies", 
    "cleanup_dependencies", 
    
    "get_http_client",
    "HttpClientDep",
    
    "get_sparql_service",
    "SparqlService",
    "SparqlServiceDep",
    
    # "get_sparql_templater",
    # "SPARQLTemplater",
    # "SparqlTemplaterDep",
]