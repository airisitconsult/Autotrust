import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import (
    get_current_user,
    has_permission,
    require_inspection_access,
    require_verified_user,
)
from app.models.user import Permission, User
from app.schemas.inspection import InspectionComplete, InspectionCreate, InspectionRead
from app.services import inspection_service
from app.services.inspection_service import (
    InspectionAlreadyCompletedError,
    InspectionNotAllowedError,
    InspectionNotFoundError,
    NotVehicleOwnerError,
    VehicleNotFoundError,
)

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.post("", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
def request_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verified_user),
):
    try:
        return inspection_service.request_inspection(db, current_user, payload.vehicle_id)
    except VehicleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    except NotVehicleOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this vehicle",
        )
    except InspectionNotAllowedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


# Must come before GET /{inspection_id} — same route-ordering gotcha as
# GET /vehicles/mine vs GET /vehicles/{vehicle_id}.
@router.get("/pending", response_model=list[InspectionRead])
def list_pending_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inspection_access),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return inspection_service.list_pending_inspections(db, limit=limit, offset=offset)


@router.get("/{inspection_id}", response_model=InspectionRead)
def get_inspection(
    inspection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        inspection = inspection_service.get_inspection(db, inspection_id)
    except InspectionNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")

    is_participant = current_user.id in (inspection.requested_by_id, inspection.inspector_id)
    if not is_participant and not has_permission(current_user, Permission.MANAGE_INSPECTIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot view this inspection",
        )
    return inspection


@router.post("/{inspection_id}/complete", response_model=InspectionRead)
def complete_inspection(
    inspection_id: uuid.UUID,
    payload: InspectionComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inspection_access),
):
    try:
        return inspection_service.complete_inspection(
            db, current_user, inspection_id, payload.passed, payload.notes
        )
    except InspectionNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    except InspectionAlreadyCompletedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This inspection has already been completed",
        )
