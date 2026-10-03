from typing import Literal

from pydantic import BaseModel

from app.schemas.vehicle import VehicleRead


class MonthPoint(BaseModel):
    month: str  # "2026-05"
    label: str  # "May"
    count: int


class MoneyPoint(BaseModel):
    month: str
    label: str
    amount: float


class StateCount(BaseModel):
    state: str
    count: int


class DashboardStats(BaseModel):
    listings_total: int
    listings_active: int
    listings_sold: int
    vetted: int
    # Combined asking price of the listings that are currently for sale.
    active_value: float
    inspections_pending: int
    inspections_completed: int
    inspections_passed: int
    # Platform scope only (None for personal dashboards).
    users_total: int | None = None

    # --- sales and money ---
    # Value of cars whose payment has been confirmed (platform: everyone's;
    # personal: the cars you sold).
    sales_volume: float = 0.0
    # Platform: AutoTrust's 5% fees. Personal: payouts you've received.
    earnings: float = 0.0
    # Platform: sellers' payouts still owed. Personal: your payouts not yet paid.
    earnings_pending: float = 0.0
    orders_open: int = 0
    unread_enquiries: int = 0
    # Only for staff who may manage payments (otherwise None).
    payments_to_confirm: int | None = None
    payouts_due: int | None = None


class DashboardSummary(BaseModel):
    # "platform": figures for the whole marketplace (super admin, and major
    # admins who hold at least one permission). "personal": the user's own.
    scope: Literal["personal", "platform"]
    stats: DashboardStats
    # Last six calendar months, oldest first, zero-filled.
    listings_series: list[MonthPoint]
    inspections_series: list[MonthPoint]
    sales_series: list[MoneyPoint]
    by_state: list[StateCount]
    # Newest listings in scope. For an inspector (who isn't staff) this is
    # instead the vehicles waiting for inspection.
    recent_listings: list[VehicleRead]
