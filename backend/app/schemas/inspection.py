import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.inspection import InspectionStatus


class InspectionCreate(BaseModel):
    """Request body for POST /inspections — the vehicle owner requests one.

    The example vehicle_id below is a placeholder (all zeros) — swap it for
    the real id of a vehicle you own, e.g. from a GET /vehicles/mine response.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"vehicle_id": "00000000-0000-0000-0000-000000000000"}]
        }
    )

    vehicle_id: uuid.UUID


class InspectionComplete(BaseModel):
    """Request body for POST /inspections/{id}/complete — inspector-only."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "passed": True,
                    "notes": "Engine runs smoothly, brakes and tires in good condition, "
                    "minor scratch on rear bumper.",
                }
            ]
        }
    )

    passed: bool
    notes: str


class InspectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vehicle_id: uuid.UUID
    requested_by_id: uuid.UUID
    inspector_id: uuid.UUID | None
    status: InspectionStatus
    passed: bool | None
    notes: str | None
    ai_report: str | None
    created_at: datetime
    completed_at: datetime | None
