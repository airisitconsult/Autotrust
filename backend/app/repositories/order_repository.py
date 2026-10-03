import uuid
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus


def get_order(db: Session, order_id: uuid.UUID) -> Order | None:
    return db.query(Order).filter(Order.id == order_id).first()


def reference_exists(db: Session, reference: str) -> bool:
    return db.query(Order.id).filter(Order.reference == reference).first() is not None


def create_order(db: Session, **fields) -> Order:
    order = Order(**fields)
    db.add(order)
    db.flush()
    return order


def save(db: Session, order: Order) -> Order:
    db.commit()
    db.refresh(order)
    return order


def list_orders(
    db: Session,
    user_id: uuid.UUID | None = None,
    status: OrderStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Order]:
    """`user_id=None` lists everyone's orders (for payment staff)."""
    query = db.query(Order)
    if user_id is not None:
        query = query.filter(or_(Order.buyer_id == user_id, Order.seller_id == user_id))
    if status is not None:
        query = query.filter(Order.status == status)
    return query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()


def list_overdue(db: Session, now: datetime) -> list[Order]:
    return (
        db.query(Order)
        .filter(Order.status == OrderStatus.PENDING_PAYMENT, Order.expires_at < now)
        .all()
    )


def vehicle_has_orders(db: Session, vehicle_id: uuid.UUID) -> bool:
    return db.query(Order.id).filter(Order.vehicle_id == vehicle_id).first() is not None
