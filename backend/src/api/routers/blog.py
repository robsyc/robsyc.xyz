import logging
from typing import Optional
from fastapi import APIRouter, Response, Query

from api.models import BlogPost, SparqlMediaType
from deps import SparqlServiceDep, SparqlService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/posts")
async def get_blog_posts(
    blog_uri: Optional[str] = Query(None, description="URI of a specific blog post to retrieve"),
    limit: Optional[int] = Query(None, description="Limit the number of blog posts returned"),
    sparql_service: SparqlService = SparqlServiceDep,
    ) -> Response:
    """
    Retrieve all blog posts using a SPARQL CONSTRUCT query.
    
    Returns blog posts as RDF (Turtle format by default). If a specific blog post URI is provided, returns only that blog post.
    """
    query = BlogPost.construct_query(
        blog_uri=blog_uri,
        limit=limit
    )
    
    result = await sparql_service.query(
        query,
        accept=SparqlMediaType.RDF_TURTLE
    )
    # parse with PydanticRDF !
    # logic for edges ?