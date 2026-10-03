"""Buying a car through AutoTrust.

The money flow (manual bank transfer, confirmed by staff):

    buyer places order          car -> RESERVED   (nobody else can buy it)
    buyer transfers + reports   PAYMENT_SUBMITTED
    staff confirm the money     PAID              car -> SOLD
    buyer confirms handover     DELIVERED         (or staff, if the buyer doesn't)
    staff pay the seller 95%    COMPLETED         AutoTrust keeps the 5% fee

Cancelling before the money is confirmed (or staff cancelling after it, e.g. to
refund) puts the car back on sale. Every step checks who is allowed to do it.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core import email as email_sender
from app.core.config import settings
from app.models.order import ACTIVE_STATUSES, Order, OrderStatus
from app.models.user import Permission, User
from app.models.vehicle import Vehicle, VehicleStatus
from app.repositories import order_repository, user_repository, vehicle_repository
from app.schemas.order import OrderRead, PayTo, PaymentProof, PaymentSubmit
from app.schemas.user import BankDetails
from app.services.enquiry_service import _brief, mask_email
from app.services.vehicle_service import is_company_owner

logger = logging.getLogger("uvicorn.error")

_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I to avoid misreading


class OrderNotFoundError(Exception):
    pass


class OrderStateError(Exception):
    """The action isn't allowed in the order's current state (user-facing message)."""


class OrderForbiddenError(Exception):
    """The user isn't allowed to do this to this order (user-facing message)."""


class PaymentsNotConfiguredError(Exception):
    pass


def _now() -> datetime:
    """UTC wall-clock time, matching how timestamps are stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _payments_configured() -> bool:
    return bool(
        settings.COMPANY_BANK_NAME and settings.COMPANY_BANK_ACCOUNT_NUMBER and settings.COMPANY_BANK_ACCOUNT_NAME
    )


def _new_reference(db: Session) -> str:
    while True:
        ref = "AT-" + "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(8))
        if not order_repository.reference_exists(db, ref):
            return ref


def _money(value: float) -> float:
    return round(value + 1e-9, 2)


def _mail(db: Session, user_id: uuid.UUID, subject: str, body: str) -> None:
    """Best-effort email; a failure never blocks the order step."""
    try:
        user = user_repository.get_user_by_id(db, user_id)
        if user is not None:
            link = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/orders"
            email_sender.send_email(user.email, subject, f"{body}\n\nView your orders: {link}")
    except Exception:
        logger.warning("Could not send order email", exc_info=True)


def _release_vehicle(db: Session, order: Order) -> None:
    vehicle = vehicle_repository.get_vehicle_by_id(db, order.vehicle_id)
    if vehicle is not None and vehicle.status in (VehicleStatus.RESERVED, VehicleStatus.SOLD):
        vehicle_repository.update_vehicle(db, vehicle, {"status": VehicleStatus.LISTED})


def _cancel(db: Session, order: Order, reason: str) -> Order:
    order.status = OrderStatus.CANCELLED
    order.cancel_reason = reason
    order.cancelled_at = _now()
    order_repository.save(db, order)
    _release_vehicle(db, order)
    return order


def expire_overdue_orders(db: Session) -> None:
    """Unpaid orders whose payment window has passed are cancelled and the car
    goes back on sale. Run lazily whenever orders are read or created, so no
    background worker is needed."""
    for order in order_repository.list_overdue(db, _now()):
        _cancel(db, order, "The payment window expired.")


# ---------------------------------------------------------------- viewing


def _view(db: Session, order: Order, viewer: User) -> OrderRead:
    is_buyer = viewer.id == order.buyer_id
    is_seller = viewer.id == order.seller_id
    pay_staff = viewer.can(Permission.MANAGE_PAYMENTS)
    if not (is_buyer or is_seller or pay_staff):
        raise OrderNotFoundError(order.id)

    vehicle = vehicle_repository.get_vehicle_by_id(db, order.vehicle_id)
    buyer = user_repository.get_user_by_id(db, order.buyer_id)
    seller = user_repository.get_user_by_id(db, order.seller_id)
    seller_is_company = seller is not None and is_company_owner(seller)

    actions: list[str] = []
    s = order.status
    if is_buyer:
        if s in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED):
            actions += ["submit_payment", "cancel"]
        if s == OrderStatus.PAID:
            actions.append("confirm_receipt")
    if is_seller and s in (OrderStatus.PAID, OrderStatus.DELIVERED) and seller and not seller.has_bank_details and not seller_is_company:
        actions.append("add_bank_details")
    if pay_staff:
        if s == OrderStatus.PAYMENT_SUBMITTED:
            actions += ["confirm_payment", "reject_payment"]
        if s in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAID) and "cancel" not in actions:
            actions.append("cancel")
        if s == OrderStatus.PAID:
            actions.append("mark_delivered")
        if s == OrderStatus.DELIVERED and not seller_is_company:
            actions.append("record_payout")

    pay_to = None
    if is_buyer and s in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED):
        pay_to = PayTo(
            bank_name=settings.COMPANY_BANK_NAME,
            account_number=settings.COMPANY_BANK_ACCOUNT_NUMBER,
            account_name=settings.COMPANY_BANK_ACCOUNT_NAME,
            amount=order.price,
            currency=settings.CURRENCY_CODE,
            reference=order.reference,
        )

    payment = None
    if (is_buyer or pay_staff) and (order.payer_name or order.payment_rejected_reason):
        payment = PaymentProof(
            payer_name=order.payer_name,
            bank_reference=order.bank_reference,
            note=order.payment_note,
            submitted_at=order.payment_submitted_at,
            rejected_reason=order.payment_rejected_reason,
        )

    seller_bank = None
    if pay_staff and seller is not None and seller.has_bank_details:
        seller_bank = BankDetails(
            bank_name=seller.bank_name,
            account_number=seller.bank_account_number,
            account_name=seller.bank_account_name,
        )

    full = pay_staff  # payment staff need real addresses to follow up
    return OrderRead(
        id=order.id,
        reference=order.reference,
        status=order.status,
        vehicle=_brief(vehicle),
        my_role="buyer" if is_buyer else "seller" if is_seller else "staff",
        currency=settings.CURRENCY_CODE,
        price=order.price,
        platform_fee=order.platform_fee,
        seller_payout=order.seller_payout,
        buyer=(buyer.email if full else mask_email(buyer.email)) if buyer else "user",
        seller=(seller.email if full else mask_email(seller.email)) if seller else "user",
        pay_to=pay_to,
        payment=payment,
        seller_bank=seller_bank,
        payout_reference=order.payout_reference,
        cancel_reason=order.cancel_reason,
        created_at=order.created_at,
        expires_at=order.expires_at,
        payment_submitted_at=order.payment_submitted_at,
        paid_at=order.paid_at,
        delivered_at=order.delivered_at,
        completed_at=order.completed_at,
        cancelled_at=order.cancelled_at,
        actions=actions,
    )


def _load(db: Session, order_id: uuid.UUID) -> Order:
    expire_overdue_orders(db)
    order = order_repository.get_order(db, order_id)
    if order is None:
        raise OrderNotFoundError(order_id)
    return order


def get_order(db: Session, viewer: User, order_id: uuid.UUID) -> OrderRead:
    return _view(db, _load(db, order_id), viewer)


def list_orders(
    db: Session, viewer: User, scope: str = "mine", status: OrderStatus | None = None,
    limit: int = 50, offset: int = 0,
) -> list[OrderRead]:
    expire_overdue_orders(db)
    if scope == "all":
        if not viewer.can(Permission.MANAGE_PAYMENTS):
            raise OrderForbiddenError("You don't have access to all orders.")
        orders = order_repository.list_orders(db, None, status, limit, offset)
    else:
        orders = order_repository.list_orders(db, viewer.id, status, limit, offset)
    return [_view(db, o, viewer) for o in orders]


# ---------------------------------------------------------------- buyer steps


def create_order(db: Session, buyer: User, vehicle_id: uuid.UUID) -> OrderRead:
    if not _payments_configured():
        raise PaymentsNotConfiguredError()
    expire_overdue_orders(db)

    vehicle = vehicle_repository.get_vehicle_by_id(db, vehicle_id)
    if vehicle is None or vehicle.status != VehicleStatus.LISTED:
        raise OrderStateError("This car is no longer available.")
    if vehicle.owner_id == buyer.id:
        raise OrderStateError("You can't buy your own car.")
    seller = user_repository.get_user_by_id(db, vehicle.owner_id)

    rate = 0.0 if seller is not None and is_company_owner(seller) else settings.PLATFORM_FEE_RATE
    fee = _money(vehicle.price * rate)
    order = order_repository.create_order(
        db,
        reference=_new_reference(db),
        vehicle_id=vehicle.id,
        buyer_id=buyer.id,
        seller_id=vehicle.owner_id,
        status=OrderStatus.PENDING_PAYMENT,
        price=vehicle.price,
        fee_rate=rate,
        platform_fee=fee,
        seller_payout=_money(vehicle.price - fee),
        expires_at=_now() + timedelta(hours=settings.PAYMENT_WINDOW_HOURS),
    )
    vehicle.status = VehicleStatus.RESERVED  # same transaction as the order
    order_repository.save(db, order)

    title = f"{vehicle.year} {vehicle.make} {vehicle.model}"
    _mail(db, vehicle.owner_id, f"A buyer has started buying your {title}",
          f"A buyer has started purchasing your {title}. The car is reserved while they pay. "
          "You'll be told as soon as AutoTrust has confirmed the payment.")
    return _view(db, order, buyer)


def submit_payment(db: Session, buyer: User, order_id: uuid.UUID, payload: PaymentSubmit) -> OrderRead:
    order = _load(db, order_id)
    if order.buyer_id != buyer.id:
        raise OrderNotFoundError(order_id)
    if order.status not in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED):
        raise OrderStateError("Payment can't be submitted for this order any more.")
    order.payer_name = payload.payer_name
    order.bank_reference = payload.bank_reference
    order.payment_note = payload.note
    order.payment_rejected_reason = None
    order.payment_submitted_at = _now()
    order.status = OrderStatus.PAYMENT_SUBMITTED
    order_repository.save(db, order)
    return _view(db, order, buyer)


def confirm_receipt(db: Session, buyer: User, order_id: uuid.UUID) -> OrderRead:
    order = _load(db, order_id)
    if order.buyer_id != buyer.id:
        raise OrderNotFoundError(order_id)
    if order.status != OrderStatus.PAID:
        raise OrderStateError("You can confirm receipt once your payment has been confirmed.")
    _deliver(db, order)
    return _view(db, order, buyer)


def _deliver(db: Session, order: Order) -> None:
    order.status = OrderStatus.DELIVERED
    order.delivered_at = _now()
    seller = user_repository.get_user_by_id(db, order.seller_id)
    if seller is not None and is_company_owner(seller):
        # AutoTrust's own car: there's no one to pay out.
        order.status = OrderStatus.COMPLETED
        order.completed_at = _now()
    order_repository.save(db, order)
    if order.status == OrderStatus.DELIVERED:
        _mail(db, order.seller_id, "Handover confirmed — your payout is next",
              f"The buyer confirmed they received the car (order {order.reference}). "
              f"AutoTrust will now pay you {settings.CURRENCY_CODE} {order.seller_payout:,.2f}.")


# ---------------------------------------------------------------- staff steps


def _staff(user: User) -> None:
    if not user.can(Permission.MANAGE_PAYMENTS):
        raise OrderForbiddenError("You don't have permission to manage payments.")


def confirm_payment(db: Session, staff: User, order_id: uuid.UUID) -> OrderRead:
    _staff(staff)
    order = _load(db, order_id)
    if order.status != OrderStatus.PAYMENT_SUBMITTED:
        raise OrderStateError("There is no submitted payment to confirm on this order.")
    order.status = OrderStatus.PAID
    order.paid_at = _now()
    order.payment_confirmed_by_id = staff.id
    order_repository.save(db, order)
    vehicle = vehicle_repository.get_vehicle_by_id(db, order.vehicle_id)
    if vehicle is not None:
        vehicle_repository.update_vehicle(db, vehicle, {"status": VehicleStatus.SOLD})
    _mail(db, order.buyer_id, "Payment confirmed",
          f"We received your payment for order {order.reference}. Arrange the handover with the seller, "
          "then confirm you've received the car in your orders.")
    _mail(db, order.seller_id, "Payment received — arrange the handover",
          f"The buyer's payment for order {order.reference} is confirmed. Please hand the car over. "
          f"Your share, {settings.CURRENCY_CODE} {order.seller_payout:,.2f}, is paid once the buyer confirms. "
          "Make sure your bank details are saved in your account.")
    return _view(db, order, staff)


def reject_payment(db: Session, staff: User, order_id: uuid.UUID, reason: str) -> OrderRead:
    _staff(staff)
    order = _load(db, order_id)
    if order.status != OrderStatus.PAYMENT_SUBMITTED:
        raise OrderStateError("There is no submitted payment to reject on this order.")
    order.status = OrderStatus.PENDING_PAYMENT
    order.payment_rejected_reason = reason
    # Give the buyer a fresh window to sort it out.
    order.expires_at = _now() + timedelta(hours=settings.PAYMENT_WINDOW_HOURS)
    order_repository.save(db, order)
    _mail(db, order.buyer_id, "We couldn't confirm your payment",
          f"We couldn't confirm the payment for order {order.reference}: {reason}. "
          "Please check and submit your payment details again.")
    return _view(db, order, staff)


def mark_delivered(db: Session, staff: User, order_id: uuid.UUID) -> OrderRead:
    _staff(staff)
    order = _load(db, order_id)
    if order.status != OrderStatus.PAID:
        raise OrderStateError("Only a paid order can be marked delivered.")
    _deliver(db, order)
    return _view(db, order, staff)


def record_payout(db: Session, staff: User, order_id: uuid.UUID, reference: str) -> OrderRead:
    _staff(staff)
    order = _load(db, order_id)
    if order.status != OrderStatus.DELIVERED:
        raise OrderStateError("The seller is paid after the car has been delivered.")
    seller = user_repository.get_user_by_id(db, order.seller_id)
    if seller is None or not seller.has_bank_details:
        raise OrderStateError("The seller hasn't saved their bank details yet, so they can't be paid.")
    order.status = OrderStatus.COMPLETED
    order.payout_reference = reference
    order.payout_by_id = staff.id
    order.completed_at = _now()
    order_repository.save(db, order)
    _mail(db, order.seller_id, "Your payout has been sent",
          f"We've sent {settings.CURRENCY_CODE} {order.seller_payout:,.2f} to your bank account "
          f"for order {order.reference} (transfer reference {reference}).")
    return _view(db, order, staff)


# ---------------------------------------------------------------- cancelling


def cancel(db: Session, user: User, order_id: uuid.UUID, reason: str | None) -> OrderRead:
    order = _load(db, order_id)
    is_buyer = user.id == order.buyer_id
    is_pay_staff = user.can(Permission.MANAGE_PAYMENTS)
    if not (is_buyer or is_pay_staff):
        raise OrderNotFoundError(order_id)

    if is_pay_staff:
        allowed = (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED, OrderStatus.PAID)
    else:
        allowed = (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED)
    if order.status not in allowed:
        raise OrderStateError("This order can't be cancelled any more.")

    was_paid = order.status == OrderStatus.PAID
    if was_paid and not reason:
        raise OrderStateError("Please give a reason when cancelling a paid order (the buyer is owed a refund).")
    _cancel(db, order, reason or "Cancelled by the buyer.")
    if was_paid:
        _mail(db, order.buyer_id, "Your order was cancelled — refund due",
              f"Order {order.reference} was cancelled: {reason}. We will refund your payment.")
    else:
        _mail(db, order.seller_id, "An order for your car was cancelled",
              f"Order {order.reference} was cancelled and your car is back on sale.")
    return _view(db, order, user)
