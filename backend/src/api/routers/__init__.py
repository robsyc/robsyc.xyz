from .sparql import router as sparql_router
from .blog import router as blog_router

__all__ = [
    "sparql_router",
    "blog_router",
]