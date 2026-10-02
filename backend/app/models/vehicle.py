import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import storage
from app.db.base import Base


class VehicleCondition(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class VehicleStatus(str, enum.Enum):
    DRAFT = "draft"
    LISTED = "listed"
    SOLD = "sold"


class VehicleFeature(str, enum.Enum):
    """The fixed checklist of features a seller can tick for a listing."""

    AIR_CONDITIONING = "air_conditioning"
    POWER_STEERING = "power_steering"
    POWER_WINDOWS = "power_windows"
    ANTI_LOCK_BRAKES = "anti_lock_brakes"
    AIRBAGS = "airbags"
    BLUETOOTH = "bluetooth"
    NAVIGATION_SYSTEM = "navigation_system"
    BACKUP_CAMERA = "backup_camera"
    PARKING_SENSORS = "parking_sensors"
    SUNROOF = "sunroof"
    LEATHER_SEATS = "leather_seats"
    HEATED_SEATS = "heated_seats"
    CRUISE_CONTROL = "cruise_control"
    ALLOY_WHEELS = "alloy_wheels"
    KEYLESS_ENTRY = "keyless_entry"
    FOUR_WHEEL_DRIVE = "four_wheel_drive"
    USB_CHARGING = "usb_charging"
    THIRD_ROW_SEATING = "third_row_seating"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    vin: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    make: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    mileage: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    condition: Mapped[VehicleCondition] = mapped_column(SAEnum(VehicleCondition), nullable=False)
    # Structured Nigerian location (see app/core/nigeria_locations.py) rather
    # than a free-text field — precise, filterable, and matches how every
    # Nigerian car marketplace represents "where is this car" (State + LGA).
    state: Mapped[str] = mapped_column(String, nullable=False, index=True)
    lga: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus), nullable=False, default=VehicleStatus.LISTED
    )
    is_vetted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Stored as a plain JSON array of feature-enum values (e.g. ["bluetooth",
    # "sunroof"]), not a separate table — a many-to-many join table would be
    # the "textbook" normalized design, but a JSON list is enough for a
    # checklist that's only ever read/written whole, and it's still just a
    # native array once this moves to Firestore.
    features: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # selectin: load all photos for a page of vehicles in one extra query
    # instead of one query per vehicle. First photo (by created_at) is the cover.
    photos: Mapped[list["VehiclePhoto"]] = relationship(
        back_populates="vehicle",
        cascade="all, delete-orphan",
        order_by="VehiclePhoto.created_at",
        lazy="selectin",
    )


class VehiclePhoto(Base):
    """One uploaded picture of a vehicle. Only the storage key lives here —
    see app/core/storage.py for where the file itself goes."""

    __tablename__ = "vehicle_photos"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True
    )
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    vehicle: Mapped["Vehicle"] = relationship(back_populates="photos")

    @property
    def url(self) -> str:
        return storage.public_url(self.storage_key, "full")

    @property
    def thumb_url(self) -> str:
        return storage.public_url(self.storage_key, "thumb")
