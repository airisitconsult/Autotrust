import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Enquiry(Base):
    """A conversation between one buyer and the seller of one car. Messages go
    through AutoTrust, so neither side's email address is shared."""

    __tablename__ = "enquiries"
    __table_args__ = (UniqueConstraint("vehicle_id", "buyer_id", name="uq_enquiry_vehicle_buyer"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    # The car's owner when the enquiry started.
    seller_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    # Denormalised so the inbox can show "latest message" and "unread" without
    # loading every message.
    last_message_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    last_message_sender_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    last_message_preview: Mapped[str] = mapped_column(String, default="")
    buyer_last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    seller_last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    messages: Mapped[list["EnquiryMessage"]] = relationship(
        back_populates="enquiry", cascade="all, delete-orphan", order_by="EnquiryMessage.created_at"
    )


class EnquiryMessage(Base):
    __tablename__ = "enquiry_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enquiries.id"), nullable=False, index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    enquiry: Mapped[Enquiry] = relationship(back_populates="messages")
