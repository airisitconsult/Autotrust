import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models.vehicle import VehicleStatus

MessageText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class EnquiryCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "vehicle_id": "00000000-0000-0000-0000-000000000000",
                    "message": "Is the car still available? Can I come and see it this weekend?",
                }
            ]
        }
    )

    vehicle_id: uuid.UUID
    message: MessageText


class MessageCreate(BaseModel):
    body: MessageText


class VehicleBrief(BaseModel):
    """Just enough of a car to show beside a conversation."""

    id: uuid.UUID
    title: str
    price: float
    status: VehicleStatus
    location: str
    thumb_url: str | None = None


class EnquiryMessageRead(BaseModel):
    id: uuid.UUID
    sender: Literal["buyer", "seller"]
    mine: bool
    body: str
    created_at: datetime


class EnquirySummary(BaseModel):
    id: uuid.UUID
    vehicle: VehicleBrief
    # Which side the viewer is on in this conversation.
    my_role: Literal["buyer", "seller"]
    # Who they're talking to (masked, e.g. "j***@gmail.com").
    counterparty: str
    last_message_preview: str
    last_message_at: datetime
    unread: bool


class EnquiryDetail(EnquirySummary):
    messages: list[EnquiryMessageRead]


class UnreadCount(BaseModel):
    unread: int
