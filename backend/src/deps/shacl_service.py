import logging
from typing import Optional, Dict, Any, Literal

from fastapi import HTTPException, status
from rdflib import Graph
from pyshacl import validate as pyshacl_validate

from deps.types import SparqlMediaType
from .sparql_service import SparqlService, get_sparql_service

logger = logging.getLogger(__name__)

# TODO: rudof (Rust-based) might be more powerful than pySHACL
# Global SHACL service instance for dependency injection
_shacl_service: Optional['ShaclService'] = None


class ShaclService:
    """Wrapper around pySHACL that knows how to pull data and shapes from the triple store."""

    def __init__(
        self,
        sparql_service: SparqlService,
        default_construct_query: Optional[str] = None,
        default_shapes_query: Optional[str] = None,
    ):
        self.sparql_service = sparql_service
        self.default_construct_query = (
            default_construct_query
            or "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }"
        )
        self.default_shapes_query = default_shapes_query or """
            CONSTRUCT {
                ?shape ?sp ?so .
                ?prop ?pp ?po .
            }
            WHERE {
                { ?shape a sh:NodeShape . ?shape ?sp ?so }
                UNION
                { ?prop a sh:PropertyShape . ?prop ?pp ?po }
            }
        """

    async def _construct_graph(self, query: str) -> Graph:
        """Execute a CONSTRUCT query and materialize the rdflib Graph."""
        result = await self.sparql_service.query(
            query,
            accept=SparqlMediaType.RDF_N_TRIPLES,
        )
        if result["status_code"] != status.HTTP_200_OK:
            raise HTTPException(
                status_code=result["status_code"],
                detail="Failed to fetch graph for SHACL operation.",
            )
        graph = Graph()
        graph.parse(data=result["content"].decode("utf-8"), format="nt")
        logger.debug(f"Materialized graph with {len(graph)} triples from query: {query}")
        return graph

    async def fetch_shapes_graph(self, query: Optional[str] = None) -> Graph:
        """Retrieve the SHACL shapes graph."""
        return await self._construct_graph(query or self.default_shapes_query)

    async def fetch_data_graph(self, query: Optional[str] = None) -> Graph:
        """Retrieve the RDF data graph that will be validated."""
        return await self._construct_graph(query or self.default_construct_query)

    async def validate(
        self,
        data_query: Optional[str] = None,
        shapes_query: Optional[str] = None,
        inference: Literal["none", "rdfs", "owlrl", "both"] = "none",
        advanced: bool = True,
    ) -> Dict[str, Any]:
        """
        Run pySHACL validation using graphs sourced from the triple store.
        """
        data_graph = await self.fetch_data_graph(data_query)
        shapes_graph = await self.fetch_shapes_graph(shapes_query)

        # See: https://github.com/RDFLib/pySHACL/blob/master/pyshacl/entrypoints.py
        # Note that pySHACL is quite powerful and can even handle triples in byte-form
        conforms, report_graph, report_text = pyshacl_validate(
            data_graph=data_graph,
            shacl_graph=shapes_graph,
            ont_graph=None,
            inference=inference,
            advanced=advanced,
            abort_on_first=False,
            debug=False,
        )

        serialized_results = report_graph.serialize(format="turtle")
        logger.info(f"SHACL validation finished. conforms={conforms}")
        logger.debug(f"Report text: {report_text}")

        return {
            "conforms": conforms,
            "results_text": report_text,
            "results_graph": serialized_results,
            "data_triples": len(data_graph),
            "shape_triples": len(shapes_graph),
        }


async def initialize_shacl_service() -> None:
    """Create the singleton SHACL service."""
    global _shacl_service
    if _shacl_service is None:
        sparql_service = await get_sparql_service()
        _shacl_service = ShaclService(sparql_service)
        logger.info("SHACL service initialized")


async def cleanup_shacl_service() -> None:
    """Clean up SHACL service singleton."""
    global _shacl_service
    if _shacl_service is not None:
        _shacl_service = None
        logger.info("SHACL service cleaned up")


async def get_shacl_service() -> ShaclService:
    if _shacl_service is None:
        raise RuntimeError("SHACL service not initialized.")
    return _shacl_service

