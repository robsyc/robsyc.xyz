import logging
from pathlib import Path

from fastapi import APIRouter, Response, status
from rdflib import Graph

from api.models import SparqlQuery, SparqlMediaType
from deps import SparqlServiceDep, SparqlService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/query")
async def execute_sparql_query(
    query: SparqlQuery,
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """Execute a SPARQL query against the triple store."""
    
    result = await sparql_service.query(query.query, query.accept)
    
    return Response(
        content=result["content"],
        status_code=result["status_code"],
        media_type=result["media_type"],
    )


@router.get("/all")
async def get_all_triples(
    limit: int = 10,
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """Get a sample of all triples from the triple store (example endpoint)."""
    query = f"SELECT * WHERE {{ ?s ?p ?o }} LIMIT {limit}"
    result = await sparql_service.query(query, SparqlMediaType.SPARQL_JSON)
    
    return Response(
        content=result["content"],
        status_code=result["status_code"],
        media_type=result["media_type"],
    )


@router.delete("/clear")
async def clear_triple_store(
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """Clear all triples from the triple store."""
    update_query = "DELETE WHERE { ?s ?p ?o }"
    result = await sparql_service.update(update_query)
    
    logger.info("Triple store cleared successfully")
    return Response(
        content=result["content"],
        status_code=result["status_code"],
        media_type=result["media_type"],
    )


@router.post("/load")
async def load_kg_file(
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """Load the kg.ttl file into the triple store."""
    kg_file_path = Path(__file__).parent.parent.parent / "kg.ttl"  # backend/src/kg.ttl
    
    graph = Graph()
    try:
        graph.parse(str(kg_file_path), format="turtle")
        logger.info(f"Parsed {len(graph)} triples from kg.ttl")
    except Exception as e:
        logger.error(f"Failed to parse kg.ttl: {e}")
        return Response(
            content=f"Failed to parse kg.ttl: {e}".encode(),
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )
    
    ntriples = graph.serialize(format="nt")
    update_query = f"INSERT DATA {{ {ntriples} }}"
    
    try:
        result = await sparql_service.update(update_query)
        logger.info(f"Successfully loaded {len(graph)} triples from kg.ttl into triple store")
        return Response(
            content=result["content"],
            status_code=result["status_code"],
            media_type=result["media_type"],
        )
    except Exception as e:
        logger.error(f"Failed to insert triples: {e}")
        return Response(
            content=f"Failed to insert triples: {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain",
        )


