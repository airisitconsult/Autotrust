import uuid

from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle, VehicleCondition, VehiclePhoto, VehicleStatus


def get_vehicle_by_id(db: Session, vehicle_id: uuid.UUID) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def get_vehicle_by_vin(db: Session, vin: str) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.vin == vin).first()


def list_vehicles(
    db: Session,
    status: VehicleStatus | None = None,
    make: str | None = None,
    model: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    condition: VehicleCondition | None = None,
    body_type: str | None = None,
    state: str | None = None,
    lga: str | None = None,
    is_vetted: bool | None = None,
    features: list[str] | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Vehicle]:
    query = db.query(Vehicle)
    if status is not None:
        query = query.filter(Vehicle.status == status)
    if make is not None:
        # Case-insensitive exact match (not a %wildcard% search) — `make`
        # comes from the deduplicated /vehicles/makes dropdown, which groups
        # "Toyota"/"toyota" under one label, so the filter has to match
        # either casing too or selecting that label would silently miss rows.
        query = query.filter(Vehicle.make.ilike(make))
    if model is not None:
        # Case-insensitive exact match, same reasoning as `make` above — the
        # value comes from the /vehicles/models dropdown.
        query = query.filter(Vehicle.model.ilike(model))
    if min_price is not None:
        query = query.filter(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.filter(Vehicle.price <= max_price)
    if min_year is not None:
        query = query.filter(Vehicle.year >= min_year)
    if max_year is not None:
        query = query.filter(Vehicle.year <= max_year)
    if condition is not None:
        query = query.filter(Vehicle.condition == condition)
    if body_type is not None:
        query = query.filter(Vehicle.body_type == body_type)
    if state is not None:
        query = query.filter(Vehicle.state == state)
    if lga is not None:
        query = query.filter(Vehicle.lga == lga)
    if is_vetted is not None:
        query = query.filter(Vehicle.is_vetted == is_vetted)
    query = query.order_by(Vehicle.created_at.desc())

    # features lives in a plain JSON column, not a queryable relational
    # column, so "must have all of these features" is filtered in Python
    # rather than in SQL — fine at this scale, see phase 2 notes on why
    # features is a JSON list instead of a join table. Because of that,
    # pagination has to happen *after* the Python filter in this one case —
    # slicing before filtering would return fewer than `limit` results (or
    # skip results) whenever a features filter is combined with paging.
    if features:
        wanted = set(features)
        matching = [v for v in query.all() if wanted.issubset(set(v.features))]
        return matching[offset : offset + limit]
    return query.offset(offset).limit(limit).all()


def list_distinct_listed_makes(db: Session) -> list[str]:
    rows = (
        db.query(Vehicle.make)
        .filter(Vehicle.status == VehicleStatus.LISTED)
        .distinct()
        .order_by(Vehicle.make)
        .all()
    )
    # `make` is free text (sellers type it in), so "Toyota" and "toyota" are
    # distinct database values even though they're the same brand to a
    # buyer. De-dupe case-insensitively here rather than trying to coerce
    # what sellers type — picking one representative spelling per brand is
    # safer than auto-"fixing" casing server-side (acronym brands like BMW
    # or GMC would get mangled by a naive .title()-style normalization).
    seen: dict[str, str] = {}
    for (make,) in rows:
        seen.setdefault(make.lower(), make)
    return sorted(seen.values())


def list_distinct_listed_models(db: Session, make: str | None = None) -> list[str]:
    query = db.query(Vehicle.model).filter(Vehicle.status == VehicleStatus.LISTED)
    if make is not None:
        query = query.filter(Vehicle.make.ilike(make))
    rows = query.distinct().order_by(Vehicle.model).all()
    # Same case-insensitive de-dupe as makes (models are free text too).
    seen: dict[str, str] = {}
    for (model,) in rows:
        seen.setdefault(model.lower(), model)
    return sorted(seen.values(), key=str.lower)


def list_listed_make_models(db: Session, limit: int = 80) -> list[tuple[str, str]]:
    """Distinct (make, model) pairs among LISTED vehicles, case-insensitively
    de-duplicated — the inventory snapshot given to the AI advisor."""
    rows = (
        db.query(Vehicle.make, Vehicle.model)
        .filter(Vehicle.status == VehicleStatus.LISTED)
        .distinct()
        .all()
    )
    seen: dict[tuple[str, str], tuple[str, str]] = {}
    for make, model in rows:
        seen.setdefault((make.lower(), model.lower()), (make, model))
    return sorted(seen.values(), key=lambda mm: (mm[0].lower(), mm[1].lower()))[:limit]


def count_listed_matching_model(db: Session, make: str, model: str) -> int:
    return (
        db.query(Vehicle)
        .filter(
            Vehicle.status == VehicleStatus.LISTED,
            Vehicle.make.ilike(make),
            Vehicle.model.ilike(f"%{model}%"),
        )
        .count()
    )


def list_vehicles_by_owner(
    db: Session, owner_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id)
        .order_by(Vehicle.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def create_vehicle(db: Session, owner_id: uuid.UUID, data: dict) -> Vehicle:
    vehicle = Vehicle(owner_id=owner_id, **data)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle: Vehicle, changes: dict) -> Vehicle:
    for field, value in changes.items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def add_photo(db: Session, vehicle: Vehicle, storage_key: str, kind: str = "photo") -> VehiclePhoto:
    photo = VehiclePhoto(vehicle_id=vehicle.id, storage_key=storage_key, kind=kind)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    db.refresh(vehicle)  # keep vehicle.photos in step with the new row
    return photo


def get_photo(db: Session, vehicle_id: uuid.UUID, photo_id: uuid.UUID) -> VehiclePhoto | None:
    return (
        db.query(VehiclePhoto)
        .filter(VehiclePhoto.id == photo_id, VehiclePhoto.vehicle_id == vehicle_id)
        .first()
    )


def delete_photo(db: Session, photo: VehiclePhoto) -> None:
    db.delete(photo)
    db.commit()


def delete_vehicle(db: Session, vehicle: Vehicle) -> None:
    db.delete(vehicle)
    db.commit()


def list_vehicles_admin(
    db: Session,
    company_email: str,
    scope: str,
    status: VehicleStatus | None = None,
    make: str | None = None,
    model: str | None = None,
    body_type: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    state: str | None = None,
    lga: str | None = None,
    is_vetted: bool | None = None,
    seller: str | None = None,
    seller_id: uuid.UUID | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[tuple[Vehicle, str]], int]:
    """Every listing regardless of status, for staff. `scope` is "company"
    (cars AutoTrust lists itself) or "sellers" (everyone else's). Returns the
    page of (vehicle, owner email) pairs and the total matching count."""
    from sqlalchemy import func, or_

    from app.models.user import User, UserRole

    query = db.query(Vehicle, User.email).join(User, Vehicle.owner_id == User.id)
    is_company = or_(User.role == UserRole.SUPER_ADMIN, func.lower(User.email) == company_email.lower())
    query = query.filter(is_company if scope == "company" else ~is_company)

    if status is not None:
        query = query.filter(Vehicle.status == status)
    if make:
        query = query.filter(Vehicle.make.ilike(make))
    if model:
        query = query.filter(Vehicle.model.ilike(f"%{model}%"))
    if body_type:
        query = query.filter(Vehicle.body_type == body_type)
    if min_year is not None:
        query = query.filter(Vehicle.year >= min_year)
    if max_year is not None:
        query = query.filter(Vehicle.year <= max_year)
    if min_price is not None:
        query = query.filter(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.filter(Vehicle.price <= max_price)
    if state:
        query = query.filter(Vehicle.state == state)
    if lga:
        query = query.filter(Vehicle.lga == lga)
    if is_vetted is not None:
        query = query.filter(Vehicle.is_vetted == is_vetted)
    if seller:
        query = query.filter(User.email.ilike(f"%{seller}%"))
    if seller_id is not None:
        query = query.filter(Vehicle.owner_id == seller_id)

    total = query.count()
    rows = query.order_by(Vehicle.created_at.desc()).offset(offset).limit(limit).all()
    return [(vehicle, email) for vehicle, email in rows], total
