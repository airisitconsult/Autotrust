import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.inspection import Inspection, InspectionStatus


def get_inspection_by_id(db: Session, inspection_id: uuid.UUID) -> Inspection | None:
    return db.query(Inspection).filter(Inspection.id == inspection_id).first()


def list_pending_inspections(db: Session, limit: int = 20, offset: int = 0) -> list[Inspection]:
    return (
        db.query(Inspection)
        .filter(Inspection.status == InspectionStatus.PENDING)
        .order_by(Inspection.created_at)
        .offset(offset)
        .limit(limit)
        .all()
    )


def list_completed_inspections_for_vehicle(
    db: Session, vehicle_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> list[Inspection]:
    return (
        db.query(Inspection)
        .filter(Inspection.vehicle_id == vehicle_id, Inspection.status == InspectionStatus.COMPLETED)
        .order_by(Inspection.completed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def create_inspection(db: Session, vehicle_id: uuid.UUID, requested_by_id: uuid.UUID) -> Inspection:
    inspection = Inspection(vehicle_id=vehicle_id, requested_by_id=requested_by_id)
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


def complete_inspection(
    db: Session,
    inspection: Inspection,
    inspector_id: uuid.UUID,
    passed: bool,
    notes: str,
    ai_report: str | None,
) -> Inspection:
    inspection.inspector_id = inspector_id
    inspection.status = InspectionStatus.COMPLETED
    inspection.passed = passed
    inspection.notes = notes
    inspection.ai_report = ai_report
    inspection.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inspection)
    return inspection


def vehicle_has_inspections(db: Session, vehicle_id: uuid.UUID) -> bool:
    return db.query(Inspection.id).filter(Inspection.vehicle_id == vehicle_id).first() is not None


def has_pending_inspection(db: Session, vehicle_id: uuid.UUID) -> bool:
    return (
        db.query(Inspection.id)
        .filter(Inspection.vehicle_id == vehicle_id, Inspection.status == InspectionStatus.PENDING)
        .first()
        is not None
    )
