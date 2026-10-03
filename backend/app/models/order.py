import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(str, enum.Enum):
    # Car reserved; waiting for the buyer's bank transfer.
    PENDING_PAYMENT = "pending_payment"
    # Buyer says they've paid; waiting for staff to see the money.
    PAYMENT_SUBMITTED = "payment_submitted"
    # Staff confirmed the money arrived. The car is sold; handover can happen.
    PAID = "paid"
    # Buyer (or staff) confirmed the car was handed over.
    DELIVERED = "delivered"
    # Seller has been paid their share. Done.
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Orders in these states still hold the car.
ACTIVE_STATUSES = (
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAYMENT_SUBMITTED,
    OrderStatus.PAID,
    OrderStatus.DELIVERED,
)


class Order(Base):
    """One purchase of one car. AutoTrust receives the buyer's money, then pays
    the seller their share (price minus the platform fee) after handover."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # What the buyer writes on their bank transfer, so staff can match it.
    reference: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    seller_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING_PAYMENT, index=True
    )

    # Money, fixed when the order is placed (later price edits don't change it).
    price: Mapped[float] = mapped_column(Float, nullable=False)
    fee_rate: Mapped[float] = mapped_column(Float, nullable=False)
    platform_fee: Mapped[float] = mapped_column(Float, nullable=False)
    seller_payout: Mapped[float] = mapped_column(Float, nullable=False)

    # What the buyer reported when they said they'd paid.
    payer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    payment_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_rejected_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    payout_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    payment_submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Which staff member did each step (an audit trail for money movements).
    payment_confirmed_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    payout_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
