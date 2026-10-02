import uuid

from sqlalchemy.orm import Session

from app.core import gemini
from app.models.inspection import Inspection, InspectionStatus
from app.models.user import User
from app.repositories import inspection_repository, vehicle_repository


class VehicleNotFoundError(Exception):
    pass


class NotVehicleOwnerError(Exception):
    pass


class InspectionNotFoundError(Exception):
    pass


class InspectionAlreadyCompletedError(Exception):
    pass


def request_inspection(db: Session, requester: User, vehicle_id: uuid.UUID) -> Inspection:
    vehicle = vehicle_repository.get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
        raise VehicleNotFoundError(vehicle_id)
    if vehicle.owner_id != requester.id:
        raise NotVehicleOwnerError(vehicle_id)
    return inspection_repository.create_inspection(
        db, vehicle_id=vehicle_id, requested_by_id=requester.id
    )


def list_pending_inspections(
    db: Session, limit: int = 20, offset: int = 0
) -> list[Inspection]:
    return inspection_repository.list_pending_inspections(db, limit=limit, offset=offset)


def list_completed_inspections_for_vehicle(
    db: Session, vehicle_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> list[Inspection]:
    return inspection_repository.list_completed_inspections_for_vehicle(
        db, vehicle_id, limit=limit, offset=offset
    )


def get_inspection(db: Session, inspection_id: uuid.UUID) -> Inspection:
    inspection = inspection_repository.get_inspection_by_id(db, inspection_id)
    if inspection is None:
        raise InspectionNotFoundError(inspection_id)
    return inspection


def complete_inspection(
    db: Session, inspector: User, inspection_id: uuid.UUID, passed: bool, notes: str
) -> Inspection:
    inspection = get_inspection(db, inspection_id)
    if inspection.status == InspectionStatus.COMPLETED:
        raise InspectionAlreadyCompletedError(inspection_id)

    # Nothing currently stops a vehicle from being deleted while it has a
    # pending inspection, so this can legitimately be None — handled instead
    # of assumed away, rather than letting it crash as an AttributeError.
    vehicle = vehicle_repository.get_vehicle_by_id(db, inspection.vehicle_id)
    ai_report = gemini.generate_inspection_report(vehicle, notes, passed) if vehicle else None

    updated = inspection_repository.complete_inspection(
        db, inspection, inspector_id=inspector.id, passed=passed, notes=notes, ai_report=ai_report
    )
    # A passed inspection is what lets a regular seller's vehicle earn the
    # same is_vetted flag the company account's listings get automatically —
    # this is the "real" path to vetting, is_vetted-by-company-ownership was
    # always meant as the light stand-in for this.
    if passed and vehicle is not None:
        vehicle_repository.update_vehicle(db, vehicle, {"is_vetted": True})
    return updated
