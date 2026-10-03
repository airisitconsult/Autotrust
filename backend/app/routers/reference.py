from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.nigeria_locations import NIGERIA_STATES_LGAS

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/states-lgas", response_model=dict[str, list[str]])
def get_states_lgas():
    """States + their LGAs, so the frontend never has to keep its own copy
    of this data — one source of truth, shared by validation and dropdowns.
    """
    return NIGERIA_STATES_LGAS


class PlatformInfo(BaseModel):
    # Share of each sale AutoTrust keeps (0.05 = 5%); the seller gets the rest.
    fee_rate: float
    currency: str
    # False until the company's bank details are configured; purchases are off.
    payments_enabled: bool


@router.get("/platform", response_model=PlatformInfo)
def get_platform_info():
    """Public settings the website needs to show honest numbers and to hide
    the Buy button when purchases aren't set up yet."""
    return PlatformInfo(
        fee_rate=settings.PLATFORM_FEE_RATE,
        currency=settings.CURRENCY_CODE,
        payments_enabled=bool(
            settings.COMPANY_BANK_NAME
            and settings.COMPANY_BANK_ACCOUNT_NUMBER
            and settings.COMPANY_BANK_ACCOUNT_NAME
        ),
    )
