from .sparql import router as sparql_router
from .blog import router as blog_router
from .shacl import router as shacl_router

__all__ = [
    "sparql_router",
    "blog_router",
    "shacl_router",
]