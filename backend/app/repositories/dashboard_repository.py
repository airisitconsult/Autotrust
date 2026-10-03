"""Read-only aggregate queries behind the dashboards. `owner_id=None` means
the whole marketplace."""

import uuid
from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.inspection import Inspection, InspectionStatus
from app.models.order import ACTIVE_STATUSES, Order, OrderStatus
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus


def _vehicles(db: Session, owner_id: uuid.UUID | None):
    query = db.query(Vehicle)
    if owner_id is not None:
        query = query.filter(Vehicle.owner_id == owner_id)
    return query


def vehicle_counts(db: Session, owner_id: uuid.UUID | None) -> dict:
    base = _vehicles(db, owner_id)
    active = base.filter(Vehicle.status == VehicleStatus.LISTED)
    value = active.with_entities(func.coalesce(func.sum(Vehicle.price), 0.0)).scalar()
    return {
        "total": base.count(),
        "active": active.count(),
        "sold": base.filter(Vehicle.status == VehicleStatus.SOLD).count(),
        "vetted": base.filter(Vehicle.is_vetted.is_(True)).count(),
        "active_value": float(value or 0.0),
    }


def vehicle_created_dates(db: Session, owner_id: uuid.UUID | None, since: datetime) -> list[datetime]:
    rows = (
        _vehicles(db, owner_id)
        .filter(Vehicle.created_at >= since)
        .with_entities(Vehicle.created_at)
        .all()
    )
    return [created for (created,) in rows]


def state_counts(db: Session, owner_id: uuid.UUID | None, limit: int = 6) -> list[tuple[str, int]]:
    count = func.count(Vehicle.id)
    rows = (
        _vehicles(db, owner_id)
        .filter(Vehicle.status == VehicleStatus.LISTED)
        .with_entities(Vehicle.state, count)
        .group_by(Vehicle.state)
        .order_by(count.desc(), Vehicle.state)
        .limit(limit)
        .all()
    )
    return [(state, n) for state, n in rows]


def recent_vehicles(db: Session, owner_id: uuid.UUID | None, limit: int = 8) -> list[Vehicle]:
    return _vehicles(db, owner_id).order_by(Vehicle.created_at.desc()).limit(limit).all()


def vehicles_awaiting_inspection(db: Session, limit: int = 8) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .join(Inspection, Inspection.vehicle_id == Vehicle.id)
        .filter(Inspection.status == InspectionStatus.PENDING)
        .order_by(Inspection.created_at)
        .limit(limit)
        .all()
    )


def _inspections(
    db: Session, requested_by: uuid.UUID | None = None, inspector: uuid.UUID | None = None
):
    query = db.query(Inspection)
    if requested_by is not None:
        query = query.filter(Inspection.requested_by_id == requested_by)
    if inspector is not None:
        query = query.filter(Inspection.inspector_id == inspector)
    return query


def inspection_counts(
    db: Session,
    requested_by: uuid.UUID | None = None,
    inspector: uuid.UUID | None = None,
    pending_everywhere: bool = False,
) -> dict:
    """Counts for the given scope. `pending_everywhere` reports the whole
    pending queue regardless of scope (an inspector's queue isn't "theirs")."""
    scoped = _inspections(db, requested_by, inspector)
    completed = scoped.filter(Inspection.status == InspectionStatus.COMPLETED)
    pending_query = (
        db.query(Inspection) if pending_everywhere else scoped
    ).filter(Inspection.status == InspectionStatus.PENDING)
    return {
        "pending": pending_query.count(),
        "completed": completed.count(),
        "passed": completed.filter(Inspection.passed.is_(True)).count(),
    }


def inspection_completed_dates(
    db: Session,
    since: datetime,
    requested_by: uuid.UUID | None = None,
    inspector: uuid.UUID | None = None,
) -> list[datetime]:
    rows = (
        _inspections(db, requested_by, inspector)
        .filter(Inspection.status == InspectionStatus.COMPLETED, Inspection.completed_at >= since)
        .with_entities(Inspection.completed_at)
        .all()
    )
    return [done for (done,) in rows if done is not None]


def count_users(db: Session) -> int:
    return db.query(User).count()


_SOLD = (OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.COMPLETED)


def _orders(db: Session, seller_id: uuid.UUID | None):
    query = db.query(Order)
    if seller_id is not None:
        query = query.filter(Order.seller_id == seller_id)
    return query


def sales_figures(db: Session, seller_id: uuid.UUID | None) -> dict:
    """Money for the orders in scope (`seller_id=None` = the whole platform)."""
    sold = _orders(db, seller_id).filter(Order.status.in_(_SOLD))
    volume = sold.with_entities(func.coalesce(func.sum(Order.price), 0.0)).scalar()
    if seller_id is None:  # platform: fees earned; payouts still owed to sellers
        earned = sold.with_entities(func.coalesce(func.sum(Order.platform_fee), 0.0)).scalar()
        owed = (
            sold.filter(Order.status.in_((OrderStatus.PAID, OrderStatus.DELIVERED)), Order.fee_rate > 0)
            .with_entities(func.coalesce(func.sum(Order.seller_payout), 0.0))
            .scalar()
        )
    else:  # a seller: payouts received; payouts still to come
        earned = (
            sold.filter(Order.status == OrderStatus.COMPLETED)
            .with_entities(func.coalesce(func.sum(Order.seller_payout), 0.0))
            .scalar()
        )
        owed = (
            sold.filter(Order.status.in_((OrderStatus.PAID, OrderStatus.DELIVERED)))
            .with_entities(func.coalesce(func.sum(Order.seller_payout), 0.0))
            .scalar()
        )
    return {"volume": float(volume or 0), "earnings": float(earned or 0), "pending": float(owed or 0)}


def sales_dates(db: Session, seller_id: uuid.UUID | None, since: datetime) -> list[tuple[datetime, float]]:
    rows = (
        _orders(db, seller_id)
        .filter(Order.status.in_(_SOLD), Order.paid_at >= since)
        .with_entities(Order.paid_at, Order.price)
        .all()
    )
    return [(paid, float(price)) for paid, price in rows if paid is not None]


def open_orders(db: Session, user_id: uuid.UUID | None) -> int:
    """Active orders where the user is buyer or seller (None = all)."""
    query = db.query(Order).filter(Order.status.in_(ACTIVE_STATUSES))
    if user_id is not None:
        query = query.filter(or_(Order.buyer_id == user_id, Order.seller_id == user_id))
    return query.count()


def payments_awaiting_confirmation(db: Session) -> int:
    return db.query(Order).filter(Order.status == OrderStatus.PAYMENT_SUBMITTED).count()


def payouts_awaiting(db: Session) -> int:
    return db.query(Order).filter(Order.status == OrderStatus.DELIVERED, Order.fee_rate > 0).count()
