from typing import Optional
from pydantic import BaseModel, Field

from deps.types import SparqlMediaType

class SparqlQuery(BaseModel):
    """Model for SPARQL query requests."""
    query: str = Field(
        ...,
        description="The SPARQL query to execute",
        examples=[
            "SELECT ?class ?label WHERE {?class a owl:Class . ?class rdfs:label ?label}",
            "CONSTRUCT {?s ?p ?o} WHERE {?s ?p ?o} LIMIT 3"
        ]
    )
    accept: Optional[SparqlMediaType] = Field(
        default=SparqlMediaType.SPARQL_JSON, 
        description="Response format for SPARQL results; defaults to 'application/sparql-results+json'"
    )