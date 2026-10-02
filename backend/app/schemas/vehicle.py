import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.nigeria_locations import NIGERIA_STATES_LGAS
from app.models.vehicle import VehicleCondition, VehicleFeature, VehicleStatus


def _validate_state_lga(state: str, lga: str) -> None:
    lgas = NIGERIA_STATES_LGAS.get(state)
    if lgas is None:
        raise ValueError(f"'{state}' is not a recognized state")
    if lga not in lgas:
        raise ValueError(f"'{lga}' is not an LGA of {state}")


class VehicleCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "vin": "1HGCM82633A123456",
                    "make": "Toyota",
                    "model": "Camry",
                    "year": 2019,
                    "mileage": 45000,
                    "price": 12000,
                    "condition": "good",
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "description": "Well maintained, single owner, full service history.",
                    "features": ["air_conditioning", "bluetooth", "backup_camera"],
                }
            ]
        }
    )

    vin: str = Field(min_length=5, max_length=32)
    make: str
    model: str
    year: int = Field(ge=1980, le=2100)
    mileage: int = Field(ge=0)
    price: float = Field(gt=0)
    condition: VehicleCondition
    state: str
    lga: str
    description: str
    features: list[VehicleFeature] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_lga_belongs_to_state(self) -> "VehicleCreate":
        _validate_state_lga(self.state, self.lga)
        return self


class VehicleUpdate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"price": 11000, "status": "sold"}]}
    )

    make: str | None = None
    model: str | None = None
    year: int | None = Field(default=None, ge=1980, le=2100)
    mileage: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)
    condition: VehicleCondition | None = None
    state: str | None = None
    lga: str | None = None
    description: str | None = None
    status: VehicleStatus | None = None
    features: list[VehicleFeature] | None = None

    @model_validator(mode="after")
    def check_lga_belongs_to_state(self) -> "VehicleUpdate":
        # Only validate when both are present together — a partial update
        # changing just one of the pair (e.g. only `lga` because `state`
        # isn't changing) can't be checked without the vehicle's current
        # value, so that cross-check happens in the service layer instead.
        if self.state is not None and self.lga is not None:
            _validate_state_lga(self.state, self.lga)
        return self


class PhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    # Large image for the detail page, and a smaller cropped one for cards and
    # thumbnails (identical when photos are on local disk).
    url: str
    thumb_url: str


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    vin: str
    make: str
    model: str
    year: int
    mileage: int
    price: float
    condition: VehicleCondition
    state: str
    lga: str
    description: str
    status: VehicleStatus
    is_vetted: bool
    features: list[VehicleFeature]
    photos: list[PhotoRead] = []
    created_at: datetime
    updated_at: datetime
