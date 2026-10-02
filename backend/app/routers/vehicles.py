import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.vehicle import VehicleCondition, VehicleFeature
from app.schemas.inspection import InspectionRead
from app.schemas.vehicle import PhotoRead, VehicleCreate, VehicleRead, VehicleUpdate
from app.core import storage
from app.services import inspection_service, vehicle_service
from app.services.vehicle_service import (
    InvalidLgaForStateError,
    NotVehicleOwnerError,
    PhotoNotFoundError,
    PhotoTooLargeError,
    TooManyPhotosError,
    UnsupportedImageTypeError,
    VehicleNotFoundError,
    VinAlreadyRegisteredError,
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return vehicle_service.create_vehicle(db, current_user, vehicle_in)
    except VinAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A vehicle with this VIN is already listed",
        )


@router.get("", response_model=list[VehicleRead])
def list_vehicles(
    db: Session = Depends(get_db),
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
    features: list[VehicleFeature] | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return vehicle_service.list_public_vehicles(
        db,
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
        features=features,
        limit=limit,
        offset=offset,
    )


@router.get("/makes", response_model=list[str])
def list_available_makes(db: Session = Depends(get_db)):
    """Distinct, de-duplicated makes among currently LISTED vehicles — for
    populating the marketplace search dropdown. Must be registered before
    GET /{vehicle_id}, same route-ordering gotcha as /mine.
    """
    return vehicle_service.list_available_makes(db)


@router.get("/models", response_model=list[str])
def list_available_models(make: str | None = None, db: Session = Depends(get_db)):
    """Distinct, de-duplicated models among LISTED vehicles, optionally
    narrowed to one make — powers the dependent Model dropdown. Registered
    before GET /{vehicle_id} for the same route-ordering reason as /makes.
    """
    return vehicle_service.list_available_models(db, make)


@router.get("/mine", response_model=list[VehicleRead])
def list_my_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return vehicle_service.list_my_vehicles(db, current_user, limit=limit, offset=offset)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        return vehicle_service.get_vehicle(db, vehicle_id)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")


@router.patch("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: uuid.UUID,
    changes: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return vehicle_service.update_vehicle(db, vehicle_id, current_user, changes)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    except NotVehicleOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this vehicle",
        )
    except InvalidLgaForStateError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.get("/{vehicle_id}/inspections", response_model=list[InspectionRead])
def list_vehicle_inspection_history(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Public — completed inspection reports are the trust signal buyers are
    here for, same reasoning as vehicles themselves being publicly browsable.
    Only COMPLETED inspections show; a pending request isn't useful to a
    buyer yet and isn't exposed here (see GET /inspections/{id} for that,
    which is restricted to participants).
    """
    try:
        vehicle_service.get_vehicle(db, vehicle_id)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return inspection_service.list_completed_inspections_for_vehicle(
        db, vehicle_id, limit=limit, offset=offset
    )


@router.post(
    "/{vehicle_id}/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED
)
def upload_vehicle_photo(
    vehicle_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Owner-only. JPEG, PNG or WebP up to 5 MB, max 10 per vehicle. The type
    is detected from the file's bytes, not its name or Content-Type. The first
    photo uploaded is the listing's cover.
    """
    # Read one byte past the limit so an oversized file is detected without
    # pulling an arbitrarily large upload into memory.
    data = file.file.read(storage.MAX_IMAGE_BYTES + 1)
    try:
        return vehicle_service.add_vehicle_photo(db, vehicle_id, current_user, data)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    except NotVehicleOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this vehicle"
        )
    except PhotoTooLargeError:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large (max 5 MB)",
        )
    except UnsupportedImageTypeError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG or WebP images are allowed",
        )
    except TooManyPhotosError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A vehicle can have at most {vehicle_service.MAX_PHOTOS_PER_VEHICLE} photos",
        )
    except storage.StorageError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image storage is temporarily unavailable. Please try again.",
        )


@router.delete("/{vehicle_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_photo(
    vehicle_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        vehicle_service.delete_vehicle_photo(db, vehicle_id, photo_id, current_user)
    except (VehicleNotFoundError, PhotoNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    except NotVehicleOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this vehicle"
        )


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        vehicle_service.delete_vehicle(db, vehicle_id, current_user)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    except NotVehicleOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this vehicle",
        )
