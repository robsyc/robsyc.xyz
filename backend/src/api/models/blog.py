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