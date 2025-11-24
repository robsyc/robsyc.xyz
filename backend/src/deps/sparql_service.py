import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps

import httpx
from fastapi import HTTPException

from config import settings
from api.models import SparqlMediaType
from .http_client import get_http_client

logger = logging.getLogger(__name__)

# Global SPARQL service instance for dependency injection
_sparql_service: Optional['SparqlService'] = None


PREFIXES = """
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>

PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX dash: <http://datashapes.org/dash#>

PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX cito: <http://purl.org/spar/cito/>

PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX schema: <https://schema.org/>
PREFIX rxyz: <http://rosyc.xyz#>
"""


def handle_sparql_errors(func: Callable) -> Callable:
    """Decorator to handle SPARQL-related HTTP errors with proper FastAPI exceptions."""
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        try:
            return await func(self, *args, **kwargs)
        except httpx.ConnectError as exc:
            logger.error(f"Cannot connect to SPARQL endpoint: {exc}")
            raise HTTPException(
                status_code=502,
                detail=f"Cannot connect to SPARQL endpoint at: {self.base_endpoint}"
            )
        except httpx.TimeoutException as exc:
            logger.error(f"SPARQL endpoint request timed out: {exc}")
            raise HTTPException(
                status_code=504,
                detail=f"SPARQL endpoint request timed out after {settings.HTTP_TIMEOUT_SECONDS}s. Error: {exc}",
            )
        except httpx.HTTPStatusError as exc:
            logger.error(f"SPARQL endpoint returned error status: {exc}")
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"SPARQL endpoint returned error: {exc.response.text}",
            )
        except httpx.RequestError as exc:
            logger.error(f"Request error: {exc}")
            raise HTTPException(status_code=502, detail=f"Request error: {exc}")
    return wrapper


class SparqlService:
    """Service for executing SPARQL queries and updates against the triple store."""
    # TODO: may want to add /stream helper function for streamed reads
    
    def __init__(self, http_client: httpx.AsyncClient):
        self.http_client = http_client
        self.base_endpoint = settings.SPARQL_ENDPOINT.rstrip('/')
        self.provider = settings.SPARQL_PROVIDER.lower()
        self.auth = self._get_auth()
        
        # Validate provider-specific settings
        if self.provider == "graphdb":
            if not settings.SPARQL_REPOSITORY:
                raise ValueError(
                    "SPARQL_REPOSITORY must be set when using GraphDB provider. "
                    "Example: SPARQL_REPOSITORY=starwars"
                )
            self.repository = settings.SPARQL_REPOSITORY
        elif self.provider not in ("tentris", "graphdb"):
            raise ValueError(
                f"Invalid SPARQL_PROVIDER: {self.provider}. "
                "Must be 'tentris' or 'graphdb'"
            )
    
    def _get_auth(self) -> Optional[httpx.BasicAuth]:
        """Get authentication for the SPARQL endpoint."""
        if settings.SPARQL_USERNAME and settings.SPARQL_PASSWORD:
            return httpx.BasicAuth(settings.SPARQL_USERNAME, settings.SPARQL_PASSWORD)
        return None
    
    def _get_query_endpoint(self) -> str:
        """Get the query endpoint URL based on the provider."""
        if self.provider == "tentris":
            return f"{self.base_endpoint}/sparql"
        elif self.provider == "graphdb":
            return f"{self.base_endpoint}/repositories/{self.repository}"
        raise ValueError(f"Unsupported provider: {self.provider}")
    
    def _get_update_endpoint(self) -> str:
        """Get the update endpoint URL based on the provider."""
        if self.provider == "tentris":
            return f"{self.base_endpoint}/update"
        elif self.provider == "graphdb":
            return f"{self.base_endpoint}/repositories/{self.repository}/statements"
        raise ValueError(f"Unsupported provider: {self.provider}")
    
    def _prepare_sparql(self, sparql_statement: str) -> str:
        """Prepare SPARQL statement by adding prefixes."""
        return PREFIXES + sparql_statement
    
    def _build_response(self, response: httpx.Response, accept: str) -> Dict[str, Any]:
        """Build standardized response dictionary."""
        return {
            "content": response.content,
            "status_code": response.status_code,
            "media_type": response.headers.get("content-type", accept),
        }
    
    @handle_sparql_errors
    async def query(
        self, 
        sparql_query: str, 
        accept: SparqlMediaType = SparqlMediaType.SPARQL_JSON
        ) -> Dict[str, Any]:
        """
        Execute a SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE) and return results.
        
        Args:
            sparql_query: The SPARQL query to execute.
            accept: The media type to accept in the response (default: SPARQL_JSON (application/sparql-results+json)).
        
        Returns:
            A dictionary containing the response content, status code, and media type.
        """
        query = self._prepare_sparql(sparql_query)
        endpoint = self._get_query_endpoint()
        
        headers = {"Accept": accept}
        
        # Tentris uses raw SPARQL query in body, GraphDB uses form-encoded
        if self.provider == "tentris":
            headers["Content-Type"] = "application/sparql-query"
            logger.debug(f"Executing SPARQL query (Tentris) with accept: {accept}: {query}")
            response = await self.http_client.post(
                endpoint,
                content=query,
                headers=headers,
                auth=self.auth,
            )
        else:  # graphdb
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            logger.debug(f"Executing SPARQL query (GraphDB) with accept: {accept}: {query}")
            response = await self.http_client.post(
                endpoint,
                data={"query": query},
                headers=headers,
                auth=self.auth,
            )
        
        response.raise_for_status()
        logger.debug(f"SPARQL query response:\n{response.content.decode('utf-8')}")
        return self._build_response(response, accept)
    
    @handle_sparql_errors
    async def update(
        self, 
        sparql_update: str,
        accept: SparqlMediaType = SparqlMediaType.APP_JSON
        ) -> Dict[str, Any]:
        """
        Execute a SPARQL update (INSERT, DELETE, LOAD) and return results.
        
        Args:
            sparql_update: The SPARQL update to execute.
            accept: The media type to accept in the response (default: APP_JSON (application/json)).
        
        Returns:
            A dictionary containing the response content, status code, and media type.
        """
        update = self._prepare_sparql(sparql_update)
        endpoint = self._get_update_endpoint()
        
        headers = {"Accept": accept}
        
        # Tentris uses raw SPARQL update in body, GraphDB uses form-encoded
        if self.provider == "tentris":
            headers["Content-Type"] = "application/sparql-update"
            logger.debug(f"Executing SPARQL update (Tentris) with accept: {accept}: {update}")
            response = await self.http_client.post(
                endpoint,
                content=update,
                headers=headers,
                auth=self.auth,
            )
        else:  # graphdb
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            logger.debug(f"Executing SPARQL update (GraphDB) with accept: {accept}: {update}")
            response = await self.http_client.post(
                endpoint,
                data={"update": update},
                headers=headers,
                auth=self.auth,
            )
        
        response.raise_for_status()
        logger.debug(f"SPARQL update response:\n{response.content.decode('utf-8')}")
        return self._build_response(response, accept)
    
    async def health_check(self) -> bool:
        """Check if the SPARQL endpoint is available."""
        try:
            test_query = "ASK { ?s ?p ?o }"
            await self.query(test_query)
            return True
        except Exception as exc:
            logger.error(f"SPARQL endpoint health check failed: {exc}")
            return False


async def initialize_sparql_service() -> None:
    """Initialize the SPARQL service."""
    global _sparql_service
    if _sparql_service is None:
        http_client = await get_http_client()
        _sparql_service = SparqlService(http_client)
        logger.info("SPARQL service initialized")
    
    if not await _sparql_service.health_check():
        raise RuntimeError(
            f"SPARQL endpoint at {settings.SPARQL_ENDPOINT} ({settings.SPARQL_PROVIDER}) is not available. "
            "Please check the endpoint configuration and ensure the service is running."
        )
    logger.info("SPARQL endpoint healthy")


async def cleanup_sparql_service() -> None:
    """Cleanup the SPARQL service."""
    global _sparql_service
    if _sparql_service is not None:
        _sparql_service = None
        logger.info("SPARQL service cleaned up")


async def get_sparql_service() -> SparqlService:
    """Dependency to get the SPARQL service instance."""
    if _sparql_service is None:
        raise RuntimeError("SPARQL service not initialized.")
    return _sparql_service
