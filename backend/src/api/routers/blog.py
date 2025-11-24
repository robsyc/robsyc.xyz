import logging
from typing import Optional
from fastapi import APIRouter, Response, Query, HTTPException, status
from rdflib import Graph

from api.models import BlogPost
from deps import SparqlServiceDep, SparqlService, SparqlMediaType

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
async def get_blog_posts(
    uri: Optional[str] = Query(None, description="URI of a specific blog post to retrieve"),
    limit: Optional[int] = Query(None, description="Limit the number of blog posts returned"),
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """
    Retrieve all blog posts using a SPARQL CONSTRUCT query.
    """
    query = BlogPost.construct_query(uri=uri, limit=limit)
    result = await sparql_service.query(query, accept=SparqlMediaType.RDF_N_TRIPLES)
    
    if result["status_code"] != 200:
        logger.error(f"Failed to retrieve blog post(s) from graph: {result}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve blog post(s) from graph",
        )
    
    graph = Graph()
    graph.parse(data=result["content"], format="nt")
    blog_posts = BlogPost.all_entities(graph)

    return blog_posts
    # logic for edges ?

# post & delete route!