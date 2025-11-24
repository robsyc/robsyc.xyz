from rdflib import Namespace, SDO
from pydantic_rdf import BaseRdfModel, WithPredicate
from typing import Annotated, Optional, List
from pydantic import Field
from datetime import datetime
from rdflib import URIRef

RXYZ = Namespace("http://rosyc.xyz#")

class BlogPost(BaseRdfModel):
    """
    Blog post model based on Schema.org BlogPosting.
    
    Maps to Schema.org properties:
    - author: The author of the blog post (Person or Organization)
    - headline: The title of the blog post
    - datePublished: Creation/publication date
    - dateModified: Last edit date
    - abstract: Summary/abstract of the blog post
    - keywords: Tags/keywords associated with the blog post
    - articleBody: The actual content of the blog post

    Additional properties:
    - x: Horizontal position of the blog post in the UI
    - y: Vertical position of the blog post in the UI
    """
    rdf_type = SDO.BlogPosting
    x: Annotated[int, WithPredicate(RXYZ.x)] = Field(default=0)
    y: Annotated[int, WithPredicate(RXYZ.y)] = Field(default=0)
    
    author: Annotated[
        URIRef, WithPredicate(SDO.author)
        ] = Field(default=RXYZ.me)

    headline: Annotated[
        str, WithPredicate(SDO.headline)]

    datePublished: Annotated[
        datetime, WithPredicate(SDO.datePublished)
        ] = Field(default_factory=datetime.now)
        
    dateModified: Annotated[
        datetime, WithPredicate(SDO.dateModified)
        ] = Field(default_factory=datetime.now)
    
    description: Annotated[
        str, WithPredicate(SDO.abstract)]
    
    keywords: Annotated[
        List[str], WithPredicate(SDO.keywords)
        ] = Field(default_factory=list)
    
    articleBody: Annotated[
        str, WithPredicate(SDO.articleBody)]
    
    @classmethod
    def construct_query(
        cls,
        uri: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> str:
        """
        Generate a SPARQL CONSTRUCT query to retrieve blog posts.
        
        Args:
            uri: Optional URI of a specific blog post to retrieve. If None, retrieves all blog posts.
            limit: Optional limit on the number of results.
            # TODO: currently only get last x posts, but we want to enable pagination-like behaviour (use date?)
        
        Returns:
            SPARQL CONSTRUCT query string.
        """
        graph_patterns = [
            "?post a schema:BlogPosting",
            "?post rxyz:x ?x",
            "?post rxyz:y ?y",
            "?post schema:author ?author",
            "?post schema:headline ?headline",
            "?post schema:datePublished ?datePublished",
            "?post schema:dateModified ?dateModified",
            "?post schema:abstract ?abstract",
            "?post schema:keywords ?keywords",
            "?post schema:articleBody ?articleBody",
        ]
        construct_clause = "CONSTRUCT {\n   " + " .\n   ".join(graph_patterns) + "\n}"

        where_clause = "WHERE {\n   "
        where_clause += f"VALUES (?post {{ ( <{uri}> ) }})" if uri else ""
        where_clause += " .\n   ".join(graph_patterns) + "\n}"
        modifiers = f"ORDER BY DESC(?datePublished) LIMIT {limit}" if limit else ""
        
        return f"{construct_clause}\n{where_clause}{modifiers}"