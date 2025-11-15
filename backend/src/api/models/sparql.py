from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class SparqlMediaType(str, Enum):
    """
    Supported SPARQL response media types.
    - SPARQL_JSON and SPARQL_XML are for SELECT and ASK queries.
    - SPARQL_CSV and SPARQL_TSV are for SELECT queries only.
    - RDF serializations are for CONSTRUCT and DESCRIBE queries.

    See also:
    - GraphDB: https://graphdb.ontotext.com/documentation/11.1/rdf4j-rest-api.html
    - Tentris: https://docs.tentris.io/sparql_endpoints.html
    """
    SPARQL_JSON = "application/sparql-results+json" # https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/
    SPARQL_XML = "application/sparql-results+xml"   # https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
    SPARQL_CSV = "application/sparql-results+csv"   # https://www.w3.org/TR/2013/REC-sparql11-results-csv-tsv-20130321/
    SPARQL_TSV = "application/sparql-results+tsv"
    RDF_JSON_LD = "application/ld+json"             # https://www.w3.org/TR/json-ld11/
    RDF_N_TRIPLES = "application/n-triples"         # https://www.w3.org/TR/rdf11-n-triples/
    RDF_TURTLE = "text/turtle"                      # https://www.w3.org/TR/rdf11-turtle/


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