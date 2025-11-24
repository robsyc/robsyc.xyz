import logging
from fastapi import Depends

from .http_client import (
    initialize_http_client,
    cleanup_http_client,
    get_http_client
)
from .types import SparqlMediaType
from .sparql_service import (
    SparqlService,
    initialize_sparql_service,
    cleanup_sparql_service,
    get_sparql_service
)
# from .sparql_templater import (
#     SparqlTemplater,
#     initialize_sparql_templater,
#     cleanup_sparql_templater,
#     get_sparql_templater
# )
from .shacl_service import (
    ShaclService,
    initialize_shacl_service,
    cleanup_shacl_service,
    get_shacl_service
)


logger = logging.getLogger(__name__)


# Type aliases for dependency injection
HttpClientDep = Depends(get_http_client)
SparqlServiceDep = Depends(get_sparql_service)
# SparqlTemplaterDep = Depends(get_sparql_templater)
ShaclServiceDep = Depends(get_shacl_service)

# Lifecycle management functions for application startup/shutdown
async def initialize_dependencies() -> None:
    """Initialize all dependencies during application startup."""
    await initialize_http_client()
    await initialize_sparql_service()
    # await initialize_sparql_templater()
    await initialize_shacl_service()
    logger.info("All dependencies initialized successfully")


async def cleanup_dependencies() -> None:
    """Cleanup all dependencies during application shutdown."""
    await cleanup_shacl_service()
    # await cleanup_sparql_templater()
    await cleanup_sparql_service()
    await cleanup_http_client()
    logger.info("All dependencies cleaned up successfully")


__all__ = [
    "initialize_dependencies", 
    "cleanup_dependencies", 
    
    "get_http_client",
    "HttpClientDep",
    
    "SparqlMediaType",
    "get_sparql_service",
    "SparqlService",
    "SparqlServiceDep",
    
    # "get_sparql_templater",
    # "SPARQLTemplater",
    # "SparqlTemplaterDep",

    "ShaclService",
    "get_shacl_service",
    "ShaclServiceDep",
    
]