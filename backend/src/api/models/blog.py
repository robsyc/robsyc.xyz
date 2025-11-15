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
        Optional[List[str]], WithPredicate(SDO.keywords)
        ] = None
    
    articleBody: Annotated[
        str, WithPredicate(SDO.articleBody)]
    
    @classmethod
    def construct_query(
        cls,
        blog_uri: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> str:
        """
        Generate a SPARQL CONSTRUCT query to retrieve blog posts.
        
        Args:
            blog_uri: Optional URI of a specific blog post to retrieve. If None, retrieves all blog posts.
            limit: Optional limit on the number of results.
        
        Returns:
            SPARQL CONSTRUCT query string.
        """
        construct_patterns = [
            "?blogPost a schema:BlogPosting",
            "?blogPost rxyz:x ?x",
            "?blogPost rxyz:y ?y",
            "?blogPost schema:author ?author",
            "?blogPost schema:headline ?headline",
            "?blogPost schema:datePublished ?datePublished",
            "?blogPost schema:dateModified ?dateModified",
            "?blogPost schema:abstract ?abstract",
            "?blogPost schema:keywords ?keywords",
            "?blogPost schema:articleBody ?articleBody",
        ]
        
        construct_clause = "CONSTRUCT {\n    " + " ;\n    ".join(construct_patterns) + "\n}"
        
        # WHERE clause
        where_patterns = [
            "?blogPost a schema:BlogPosting",
            "OPTIONAL { ?blogPost rxyz:x ?x }",
            "OPTIONAL { ?blogPost rxyz:y ?y }",
            "OPTIONAL { ?blogPost schema:author ?author }",
            "OPTIONAL { ?blogPost schema:headline ?headline }",
            "OPTIONAL { ?blogPost schema:datePublished ?datePublished }",
            "OPTIONAL { ?blogPost schema:dateModified ?dateModified }",
            "OPTIONAL { ?blogPost schema:abstract ?abstract }",
            "OPTIONAL { ?blogPost schema:keywords ?keywords }",
            "OPTIONAL { ?blogPost schema:articleBody ?articleBody }",
        ]
        
        where_clause = "WHERE {\n    " + " .\n    ".join(where_patterns)
        
        # Add filter for specific blog post if URI provided
        if blog_uri:
            where_clause += f"\n    FILTER (?blogPost = <{blog_uri}>)"
        
        where_clause += "\n}"
        
        # Add limit if specified
        limit_clause = f" LIMIT {limit}" if limit else ""
        
        return f"{construct_clause}\n{where_clause}{limit_clause}"