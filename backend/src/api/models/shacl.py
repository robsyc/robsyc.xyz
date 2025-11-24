from typing import Literal, Optional

from pydantic import BaseModel, Field


class ShaclValidationRequest(BaseModel):
    """Input payload for SHACL validation endpoint."""

    data_query: Optional[str] = Field(
        default=None,
        description=(
            "Optional SPARQL CONSTRUCT query used to fetch the data graph. "
            "Defaults to the full dataset."
        ),
    )
    shapes_query: Optional[str] = Field(
        default=None,
        description=(
            "Optional SPARQL CONSTRUCT query used to fetch the shapes graph. "
            "Defaults to all NodeShape and PropertyShape triples."
        ),
    )
    inference: Literal["none", "rdfs", "owlrl", "both"] = Field(
        default="none",
        description="Inference regime passed to pySHACL. Mirrors pyshacl.validate options.",
    )
    advanced: bool = Field(
        default=False,
        description="Enable pySHACL advanced mode.",
    )
