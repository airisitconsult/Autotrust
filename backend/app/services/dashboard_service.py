"""What each kind of user sees on their dashboard.

* Staff (the super admin, and major admins holding at least one permission):
  platform-wide numbers.
* Everyone else: their own listings and inspections. Inspectors additionally
  see the pending queue and their own completed inspections.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import Permission, User, UserRole
from app.repositories import dashboard_repository as repo
from app.schemas.dashboard import (
    DashboardStats,
    DashboardSummary,
    MoneyPoint,
    MonthPoint,
    StateCount,
)
from app.services import enquiry_service

MONTHS_SHOWN = 6
_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _month_starts(now: datetime) -> list[datetime]:
    """First day of each of the last MONTHS_SHOWN months, oldest first."""
    year, month = now.year, now.month
    starts = []
    for _ in range(MONTHS_SHOWN):
        starts.append(datetime(year, month, 1))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(starts))


def _series(dates: list[datetime], starts: list[datetime]) -> list[MonthPoint]:
    counts = {(s.year, s.month): 0 for s in starts}
    for d in dates:
        key = (d.year, d.month)
        if key in counts:
            counts[key] += 1
    return [
        MonthPoint(month=f"{s.year}-{s.month:02d}", label=_MONTH_NAMES[s.month - 1], count=counts[(s.year, s.month)])
        for s in starts
    ]


def _money_series(rows: list[tuple[datetime, float]], starts: list[datetime]) -> list[MoneyPoint]:
    totals = {(s.year, s.month): 0.0 for s in starts}
    for when, amount in rows:
        key = (when.year, when.month)
        if key in totals:
            totals[key] += amount
    return [
        MoneyPoint(month=f"{s.year}-{s.month:02d}", label=_MONTH_NAMES[s.month - 1], amount=round(totals[(s.year, s.month)], 2))
        for s in starts
    ]


def get_summary(db: Session, user: User) -> DashboardSummary:
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # DB timestamps are naive UTC
    starts = _month_starts(now)
    since = starts[0]

    staff = user.is_staff
    owner_id = None if staff else user.id
    vehicles = repo.vehicle_counts(db, owner_id)

    if staff:
        inspections = repo.inspection_counts(db)
        completed_dates = repo.inspection_completed_dates(db, since)
    elif user.role == UserRole.INSPECTOR:
        inspections = repo.inspection_counts(db, inspector=user.id, pending_everywhere=True)
        completed_dates = repo.inspection_completed_dates(db, since, inspector=user.id)
    else:
        inspections = repo.inspection_counts(db, requested_by=user.id)
        completed_dates = repo.inspection_completed_dates(db, since, requested_by=user.id)

    if user.role == UserRole.INSPECTOR and not staff:
        recent = repo.vehicles_awaiting_inspection(db)
    else:
        recent = repo.recent_vehicles(db, owner_id)

    sales = repo.sales_figures(db, None if staff else user.id)
    pay_staff = user.can(Permission.MANAGE_PAYMENTS)

    return DashboardSummary(
        scope="platform" if staff else "personal",
        stats=DashboardStats(
            listings_total=vehicles["total"],
            listings_active=vehicles["active"],
            listings_sold=vehicles["sold"],
            vetted=vehicles["vetted"],
            active_value=vehicles["active_value"],
            inspections_pending=inspections["pending"],
            inspections_completed=inspections["completed"],
            inspections_passed=inspections["passed"],
            users_total=repo.count_users(db) if staff else None,
            sales_volume=sales["volume"],
            earnings=sales["earnings"],
            earnings_pending=sales["pending"],
            orders_open=repo.open_orders(db, None if staff else user.id),
            unread_enquiries=enquiry_service.unread_count(db, user),
            payments_to_confirm=repo.payments_awaiting_confirmation(db) if pay_staff else None,
            payouts_due=repo.payouts_awaiting(db) if pay_staff else None,
        ),
        listings_series=_series(repo.vehicle_created_dates(db, owner_id, since), starts),
        inspections_series=_series(completed_dates, starts),
        sales_series=_money_series(repo.sales_dates(db, None if staff else user.id, since), starts),
        by_state=[StateCount(state=s, count=n) for s, n in repo.state_counts(db, owner_id)],
        recent_listings=recent,
    )
