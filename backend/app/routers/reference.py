from fastapi import APIRouter

from app.core.nigeria_locations import NIGERIA_STATES_LGAS

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/states-lgas", response_model=dict[str, list[str]])
def get_states_lgas():
    """States + their LGAs, so the frontend never has to keep its own copy
    of this data — one source of truth, shared by validation and dropdowns.
    """
    return NIGERIA_STATES_LGAS
