import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_verified_user
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate, OrderRead, PayoutBody, PaymentSubmit, ReasonBody
from app.services import order_service
from app.services.order_service import (
    OrderForbiddenError,
    OrderNotFoundError,
    OrderStateError,
    PaymentsNotConfiguredError,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _call(fn, *args):
    """Run a service call and translate its business errors into HTTP errors."""
    try:
        return fn(*args)
    except OrderNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    except OrderStateError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except OrderForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except PaymentsNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Online purchases aren't available yet. Please check back soon.",
        )


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified_user),
):
    """Start buying a car. The car is reserved and you get the bank details to
    pay into, with a reference to put on the transfer."""
    return _call(order_service.create_order, db, user, payload.vehicle_id)


@router.get("", response_model=list[OrderRead])
def list_orders(
    scope: Literal["mine", "all"] = "mine",
    order_status: OrderStatus | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Orders where you are the buyer or the seller. Payment staff can pass
    scope=all to see everyone's."""
    return _call(order_service.list_orders, db, user, scope, order_status, limit, offset)


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _call(order_service.get_order, db, user, order_id)


@router.post("/{order_id}/payment", response_model=OrderRead)
def submit_payment(
    order_id: uuid.UUID,
    payload: PaymentSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Buyer: tell us you've made the bank transfer."""
    return _call(order_service.submit_payment, db, user, order_id, payload)


@router.post("/{order_id}/confirm-receipt", response_model=OrderRead)
def confirm_receipt(order_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Buyer: you've received the car. This releases the seller's payout."""
    return _call(order_service.confirm_receipt, db, user, order_id)


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(
    order_id: uuid.UUID,
    payload: ReasonBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _call(order_service.cancel, db, user, order_id, payload.reason if payload else None)


# ---- payment staff (permission: manage_payments) ----


@router.post("/{order_id}/confirm-payment", response_model=OrderRead)
def confirm_payment(order_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _call(order_service.confirm_payment, db, user, order_id)


@router.post("/{order_id}/reject-payment", response_model=OrderRead)
def reject_payment(
    order_id: uuid.UUID,
    payload: ReasonBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _call(order_service.reject_payment, db, user, order_id, payload.reason)


@router.post("/{order_id}/mark-delivered", response_model=OrderRead)
def mark_delivered(order_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _call(order_service.mark_delivered, db, user, order_id)


@router.post("/{order_id}/payout", response_model=OrderRead)
def record_payout(
    order_id: uuid.UUID,
    payload: PayoutBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record that you've transferred the seller's share, with the bank's reference."""
    return _call(order_service.record_payout, db, user, order_id, payload.payout_reference)
