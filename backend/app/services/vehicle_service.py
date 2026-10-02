import uuid

from sqlalchemy.orm import Session

from app.core import storage
from app.core.config import settings
from app.core.nigeria_locations import NIGERIA_STATES_LGAS
from app.models.user import User
from app.models.vehicle import (
    Vehicle,
    VehicleCondition,
    VehicleFeature,
    VehiclePhoto,
    VehicleStatus,
)
from app.repositories import vehicle_repository
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleNotFoundError(Exception):
    pass


class VinAlreadyRegisteredError(Exception):
    pass


class NotVehicleOwnerError(Exception):
    pass


class InvalidLgaForStateError(Exception):
    pass


class PhotoTooLargeError(Exception):
    pass


class UnsupportedImageTypeError(Exception):
    pass


class TooManyPhotosError(Exception):
    pass


class PhotoNotFoundError(Exception):
    pass


MAX_PHOTOS_PER_VEHICLE = 10


def create_vehicle(db: Session, owner: User, vehicle_in: VehicleCreate) -> Vehicle:
    if vehicle_repository.get_vehicle_by_vin(db, vehicle_in.vin):
        raise VinAlreadyRegisteredError(vehicle_in.vin)
    data = vehicle_in.model_dump()
    data["is_vetted"] = owner.email.lower() == settings.COMPANY_ACCOUNT_EMAIL.lower()
    # features is a plain JSON column (not a SQLAlchemy Enum column like
    # condition/status), so it has no built-in enum handling — store plain
    # string values ourselves rather than raw VehicleFeature members.
    data["features"] = [feature.value for feature in vehicle_in.features]
    return vehicle_repository.create_vehicle(db, owner_id=owner.id, data=data)


def list_public_vehicles(
    db: Session,
    make: str | None = None,
    model: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    condition: VehicleCondition | None = None,
    state: str | None = None,
    lga: str | None = None,
    is_vetted: bool | None = None,
    features: list[VehicleFeature] | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Vehicle]:
    return vehicle_repository.list_vehicles(
        db,
        status=VehicleStatus.LISTED,
        make=make,
        model=model,
        min_price=min_price,
        max_price=max_price,
        min_year=min_year,
        max_year=max_year,
        condition=condition,
        state=state,
        lga=lga,
        is_vetted=is_vetted,
        features=[feature.value for feature in features] if features else None,
        limit=limit,
        offset=offset,
    )


def list_available_makes(db: Session) -> list[str]:
    return vehicle_repository.list_distinct_listed_makes(db)


def list_available_models(db: Session, make: str | None = None) -> list[str]:
    return vehicle_repository.list_distinct_listed_models(db, make)


def list_my_vehicles(
    db: Session, owner: User, limit: int = 20, offset: int = 0
) -> list[Vehicle]:
    return vehicle_repository.list_vehicles_by_owner(db, owner.id, limit=limit, offset=offset)


def get_vehicle(db: Session, vehicle_id: uuid.UUID) -> Vehicle:
    vehicle = vehicle_repository.get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
        raise VehicleNotFoundError(vehicle_id)
    return vehicle


def update_vehicle(
    db: Session, vehicle_id: uuid.UUID, current_user: User, changes: VehicleUpdate
) -> Vehicle:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.owner_id != current_user.id:
        raise NotVehicleOwnerError(vehicle_id)
    update_data = changes.model_dump(exclude_unset=True)
    if "features" in update_data:
        update_data["features"] = [feature.value for feature in changes.features]
    # The schema only cross-checks state+lga when both are sent together in
    # the same request. A client changing just one of the pair (e.g. moving
    # the car to a different LGA within the same state) needs checking
    # against whichever one isn't in this update — the vehicle's current value.
    if "state" in update_data or "lga" in update_data:
        effective_state = update_data.get("state", vehicle.state)
        effective_lga = update_data.get("lga", vehicle.lga)
        if effective_lga not in NIGERIA_STATES_LGAS.get(effective_state, []):
            raise InvalidLgaForStateError(f"{effective_lga} is not an LGA of {effective_state}")
    return vehicle_repository.update_vehicle(db, vehicle, update_data)


def delete_vehicle(db: Session, vehicle_id: uuid.UUID, current_user: User) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.owner_id != current_user.id:
        raise NotVehicleOwnerError(vehicle_id)
    keys = [photo.storage_key for photo in vehicle.photos]
    vehicle_repository.delete_vehicle(db, vehicle)  # cascades the photo rows
    for key in keys:  # then the files, so none are orphaned on disk
        storage.delete_image(key)


def _get_owned_vehicle(db: Session, vehicle_id: uuid.UUID, current_user: User) -> Vehicle:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.owner_id != current_user.id:
        raise NotVehicleOwnerError(vehicle_id)
    return vehicle


def add_vehicle_photo(
    db: Session, vehicle_id: uuid.UUID, current_user: User, data: bytes
) -> VehiclePhoto:
    vehicle = _get_owned_vehicle(db, vehicle_id, current_user)
    if len(data) > storage.MAX_IMAGE_BYTES:
        raise PhotoTooLargeError()
    image_type = storage.detect_image_type(data)
    if image_type is None:
        raise UnsupportedImageTypeError()
    if len(vehicle.photos) >= MAX_PHOTOS_PER_VEHICLE:
        raise TooManyPhotosError()
    key = storage.save_image(f"vehicles/{vehicle.id}", data, image_type)
    try:
        return vehicle_repository.add_photo(db, vehicle, key)
    except Exception:
        # The file is already stored but has no database row — remove it so
        # it isn't orphaned (and billed) forever.
        db.rollback()
        storage.delete_image(key)
        raise


def delete_vehicle_photo(
    db: Session, vehicle_id: uuid.UUID, photo_id: uuid.UUID, current_user: User
) -> None:
    _get_owned_vehicle(db, vehicle_id, current_user)
    photo = vehicle_repository.get_photo(db, vehicle_id, photo_id)
    if photo is None:
        raise PhotoNotFoundError(photo_id)
    key = photo.storage_key
    vehicle_repository.delete_photo(db, photo)
    storage.delete_image(key)
