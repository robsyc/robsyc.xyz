# THIS IS NOT USED YET
# Might be overkill to use Jinja2... just Python Templates?

import logging
from pathlib import Path
from typing import Dict, Optional, Union

from jinja2 import Environment, FileSystemLoader, Template
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Global instances for dependency injection
_sparql_templater: Optional['SPARQLTemplater'] = None


class SPARQLTemplater:
    """Generic SPARQL query builder using Jinja2 templates."""
    
    def __init__(self, templates_dir: Optional[Path] = None):
        """Initialize with templates directory."""
        if templates_dir is None:
            # Default to query_templates directory
            templates_dir = Path(__file__).parent.parent / "api" / "models" / "query_templates"
        
        self.env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True
        )
        self._template_cache: Dict[str, Template] = {}
    
    def build_query(self, template_name: str, query_model: Union[BaseModel, dict, None]) -> str:
        """Build SPARQL query from template and query model data."""
        template = self._get_template(template_name)
        
        # Convert Pydantic model to dict for template context
        # computed_field decorated properties are automatically included
        if isinstance(query_model, BaseModel):
            context = query_model.model_dump(exclude_none=True)
        else:
            context = query_model
        
        return template.render(**context)
    
    def _get_template(self, template_name: str) -> Template:
        """Get template with caching."""
        if template_name not in self._template_cache:
            self._template_cache[template_name] = self.env.get_template(template_name)
        return self._template_cache[template_name]


async def initialize_sparql_templater() -> None:
    """Initialize SPARQL templater."""
    global _sparql_templater
    if _sparql_templater is None:
        _sparql_templater = SPARQLTemplater()
    logger.info("SPARQL templater initialized")


async def cleanup_sparql_templater() -> None:
    """Cleanup SPARQL templater."""
    global _sparql_templater
    if _sparql_templater is not None:
        _sparql_templater = None
        logger.info("SPARQL templater cleaned up")


async def get_sparql_templater() -> SPARQLTemplater:
    """Get SPARQL templater instance."""
    if _sparql_templater is None:
        raise RuntimeError("SPARQL templater not initialized.")
    return _sparql_templater