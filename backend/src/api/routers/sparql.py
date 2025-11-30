import logging
from pathlib import Path
from typing import Optional, Literal
import json

from fastapi import APIRouter, Response, status, Query
from rdflib import Graph

from api.models import SparqlQuery
from deps import SparqlServiceDep, SparqlService, SparqlMediaType

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
    limit: int = Query(default=10, description="Limit the number of triples returned"),
    accept: Optional[SparqlMediaType] = Query(default=SparqlMediaType.RDF_TURTLE, description="Media type for response"),
    sparql_service: SparqlService = SparqlServiceDep,
) -> Response:
    """
    Get a sample of all triples from the triple store.

    - **limit**: Limit the number of triples returned (query parameter).
    - **accept**: Expected media type for the response (query parameter, optional).
    """
    query = f"CONSTRUCT {{ ?s ?p ?o }} WHERE {{ ?s ?p ?o }} LIMIT {limit}"
    try:
        result = await sparql_service.query(query, accept)
        return Response(
            content=result["content"],
            status_code=result["status_code"],
            media_type=result["media_type"],
        )
    except Exception as e:
        logger.error(f"Failed to get all triples: {e}")
        return Response(
            content=f"Failed to get all triples: {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain",
        )

@router.get("/count")
async def count_triples(
    sparql_service: SparqlService = SparqlServiceDep,
) -> Response:
    """Count the number of triples in the triple store."""

    query = "SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }"
    try:
        result = await sparql_service.query(query, SparqlMediaType.SPARQL_JSON)
        return Response(
            content=result["content"],
            status_code=result["status_code"],
            media_type=result["media_type"],
        )
    except Exception as e:
        logger.error(f"Failed to count triples: {e}")
        return Response(
            content=f"Failed to count triples: {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain",
        )

@router.delete("/clear")
async def clear_triples(
    sparql_service: SparqlService = SparqlServiceDep,
) -> Response:
    """Clear all triples from the triple store."""

    update_query = "DELETE WHERE { ?s ?p ?o }"
    try:
        result = await sparql_service.update(update_query)
        logger.info("Triple store cleared successfully")
        return Response(
            content=result["content"],
            status_code=result["status_code"],
            media_type=result["media_type"],
        )
    except Exception as e:
        logger.error(f"Failed to clear triple store: {e}")
        return Response(
            content=f"Failed to clear triple store: {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain",
        )

# TODO: this approach is not optimal, but we should revise our node-based story
#       to use an agent that prompts the user to visit the blog
@router.get("/graphs/{name}")
async def get_graph(
    name: Literal["home", "data", "shapes"] = "home",
    target_class: Optional[str] = Query(
        default=None,
        description="Filter by target class (e.g., 'schema:BlogPosting' or full IRI)"
    ),
    sparql_service: SparqlService = SparqlServiceDep,
) -> Response:
    """
    Retrieve a named graph as Turtle for the frontend to load.
    
    - **home**: SiteNavigationElement and its shape (initial page load)
    - **data**: Instance data, optionally filtered by target_class
    - **shapes**: SHACL shapes, optionally filtered by target_class
    
    The target_class parameter accepts prefixed names (schema:BlogPosting) or full IRIs.
    """
    
    def build_query(name: str, target_class: Optional[str]) -> str:
        """Build SPARQL CONSTRUCT query based on graph name and optional filter."""
        
        if name == "home":
            # Home is always the entry point - no filtering needed
            return """
                CONSTRUCT { ?s ?p ?o }
                WHERE {
                    {
                        ?s a schema:SiteNavigationElement .
                        ?s ?p ?o .
                    }
                    UNION
                    {
                        ?s a sh:NodeShape .
                        ?s sh:targetClass schema:SiteNavigationElement .
                        ?s ?p ?o .
                    }
                    UNION
                    {
                        ?shape a sh:NodeShape .
                        ?shape sh:targetClass schema:SiteNavigationElement .
                        ?shape sh:property ?s .
                        ?s ?p ?o .
                    }
                }
            """
        
        if name == "data":
            if target_class:
                # Fetch instances of a specific class
                return f"""
                    CONSTRUCT {{ ?s ?p ?o }}
                    WHERE {{
                        ?s a {target_class} .
                        ?s ?p ?o .
                    }}
                """
            else:
                # Default: fetch common data types
                return """
                    CONSTRUCT { ?s ?p ?o }
                    WHERE {
                        VALUES ?type { schema:BlogPosting schema:Person schema:Blog }
                        ?s a ?type .
                        ?s ?p ?o .
                    }
                """
        
        if name == "shapes":
            if target_class:
                # Fetch shape for a specific target class
                return f"""
                    CONSTRUCT {{ ?s ?p ?o }}
                    WHERE {{
                        {{
                            ?s a sh:NodeShape .
                            ?s sh:targetClass {target_class} .
                            ?s ?p ?o .
                        }}
                        UNION
                        {{
                            ?shape a sh:NodeShape .
                            ?shape sh:targetClass {target_class} .
                            ?shape sh:property ?s .
                            ?s ?p ?o .
                        }}
                    }}
                """
            else:
                # Fetch all shapes (fallback, but frontend should prefer targeted fetches)
                return """
                    CONSTRUCT { ?s ?p ?o }
                    WHERE {
                        {
                            ?s a sh:NodeShape .
                            ?s ?p ?o .
                        }
                        UNION
                        {
                            ?shape a sh:NodeShape .
                            ?shape sh:property ?s .
                            ?s ?p ?o .
                        }
                    }
                """
        
        return ""
    
    query = build_query(name, target_class)
    if not query:
        return Response(
            content=f"Unknown graph name: {name}".encode(),
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )
    
    try:
        result = await sparql_service.query(query, SparqlMediaType.RDF_TURTLE)
        return Response(
            content=result["content"],
            status_code=result["status_code"],
            media_type="text/turtle",
        )
    except Exception as e:
        logger.error(f"Failed to get graph '{name}': {e}")
        return Response(
            content=f"Failed to get graph '{name}': {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="text/plain",
        )


@router.post("/load")
async def load_triples(
    file: Literal["data", "onto", "shapes", "home", "all"] = Query(
        default="data", description="Name of the ttl file to load"
    ),
    sparql_service: SparqlService = SparqlServiceDep,
) -> Response:
    """
    Load the specified TTL file, or all, into the triple store.
    """
    file_paths = {
        "data": Path(__file__).parent.parent.parent / "graphs" / "data.ttl",
        "onto": Path(__file__).parent.parent.parent / "graphs" / "onto.ttl",
        "shapes": Path(__file__).parent.parent.parent / "graphs" / "shapes.ttl",
        "home": Path(__file__).parent.parent.parent / "graphs" / "home.ttl",
    }

    graph = Graph()

    try:
        if file == "all":
            loaded_files = []
            for k, p in file_paths.items():
                graph.parse(str(p), format="turtle")
                loaded_files.append((str(p), len(graph)))
            logger.info(
                f"Parsed triples from all files. Total triples: {len(graph)}"
            )
        else:
            if file not in file_paths:
                raise ValueError(f"Unknown file key: {file}")
            file_path = file_paths[file]
            graph.parse(str(file_path), format="turtle")
            logger.info(f"Parsed {len(graph)} triples from {file_path}")
    except Exception as e:
        logger.error(f"Failed to parse file(s): {e}")
        return Response(
            content=f"Failed to parse file(s): {e}".encode(),
            status_code=status.HTTP_400_BAD_REQUEST,
            media_type="text/plain",
        )

    ntriples = graph.serialize(format="nt")
    update_query = f"INSERT DATA {{ {ntriples} }}"

    try:
        result = await sparql_service.update(update_query)
        logger.info(f"Successfully loaded {len(graph)} triples into triple store")
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


