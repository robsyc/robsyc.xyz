import logging

from fastapi import APIRouter, Response, HTTPException, status

from api.models import ShaclValidationRequest
from deps import ShaclServiceDep, ShaclService


logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/shapes", deprecated=True)
async def get_shapes_graph(
    shacl_service: ShaclService = ShaclServiceDep,
) -> Response:
    """
    Retrieve the SHACL shapes graph from the triple store.
    
    DEPRECATED: Use GET /sparql/graphs/shapes instead, which supports
    filtering by target_class for more efficient fetching.
    """
    shapes_graph = await shacl_service.fetch_shapes_graph()
    ttl = shapes_graph.serialize(format="turtle")
    return Response(
        content=ttl,
        media_type="text/turtle",
        status_code=status.HTTP_200_OK,
    )


@router.post("/validate")
async def validate_graph(
    payload: ShaclValidationRequest,
    shacl_service: ShaclService = ShaclServiceDep,
) -> dict:
    """
    Run SHACL validation against the data graph stored in the triple store.
    """
    try:
        result = await shacl_service.validate(
            data_query=payload.data_query,
            shapes_query=payload.shapes_query,
            inference=payload.inference,
            advanced=payload.advanced,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("SHACL validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SHACL validation failed.",
        ) from exc

