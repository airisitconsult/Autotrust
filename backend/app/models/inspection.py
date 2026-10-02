import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InspectionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class Inspection(Base):
    """A request to have one vehicle physically inspected, and (once an
    inspector submits findings) the result. This is what lets *any* vehicle
    earn Vehicle.is_vetted = True, not just ones the company account owns.
    """

    __tablename__ = "inspections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    # Null until an inspector picks it up by completing it — there's no
    # separate "claim" step, completing an inspection *is* claiming it.
    inspector_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[InspectionStatus] = mapped_column(
        SAEnum(InspectionStatus), nullable=False, default=InspectionStatus.PENDING
    )
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Gemini-generated, buyer-facing rewrite of `notes`. Null whenever the AI
    # call hasn't been made yet or failed (no real API key configured, etc.)
    # — see app/core/gemini.py. Never required for an inspection to be valid.
    ai_report: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
