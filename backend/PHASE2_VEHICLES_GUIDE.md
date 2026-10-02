# Phase 2 Implementation Guide — Vehicle Listings

**Your role**: write every file below yourself, in order, verifying as you go.
**My role**: tech lead — review, explain, and debug when something breaks. If you hit an error, paste the exact error/traceback and tell me which step you were on.

Don't skip the "Verify" step at the end of each section. If it doesn't work, stop there and debug before moving on — don't push forward on a broken foundation.

---

## 0. Recap and goal

Phase 1 gave you: `User` model, register/login/JWT, and the layered pattern (`models` → `schemas` → `repositories` → `services` → `routers`). Phase 2 reuses that exact pattern for a new resource: **vehicle listings**.

By the end, you'll have:
- Any logged-in user can list a vehicle for sale (they become its owner).
- Anyone (no login) can browse listed vehicles and view one by id.
- A logged-in user can see their own listings, including ones not yet public.
- Only the **owner** of a vehicle can edit or delete it — a new concept beyond phase 1's "are you logged in" check: **authorization** ("are you *allowed* to do this specific thing"), not just authentication ("who are you").
- Vehicles listed by AutoTrust's own company account come back flagged `is_vetted: true` automatically — no separate inspection workflow yet, just a way to show "these are ours, already vetted" vs. regular seller listings.

Decisions already made (from our chat): fuller field set (VIN, condition, location included now), browsing is public — no login needed to view listings, and a lightweight company-vetted flag rather than a full inspector/report workflow (that's a later phase — see section 5).

---

## 1. Data model design

| Field | Type | Notes |
|---|---|---|
| `id` | UUID, PK | auto-generated, same as `User.id` — not sequential/guessable |
| `owner_id` | UUID, FK → `users.id` | who listed it — new concept: **foreign key**, a column that points at another table's row |
| `vin` | string, unique | Vehicle Identification Number; unique like email was for `User` |
| `make` | string | e.g. "Toyota" |
| `model` | string | e.g. "Camry" |
| `year` | int | manufacture year |
| `mileage` | int | in km |
| `price` | float | keep as float for now — a real production system would use `Decimal`/fixed-point for money to avoid rounding errors, but float is fine while learning |
| `condition` | enum | `excellent` / `good` / `fair` / `poor` — new concept: **enum column**, restricts values at both the Python and DB level |
| `location` | string | free-text city/area for now |
| `description` | text | free-text |
| `status` | enum | `draft` / `listed` / `sold` — controls what strangers can see |
| `is_vetted` | bool | `true` only when the vehicle's owner is AutoTrust's own company account |
| `features` | list of enum | fixed checklist (e.g. `air_conditioning`, `sunroof`, `bluetooth`...) a seller ticks; defaults to empty |
| `created_at` | datetime | auto |
| `updated_at` | datetime | auto-updates on change |

**Design call**: a client can never set `status` directly on create — every new vehicle starts as `listed` automatically. `status` can only change later via the update endpoint (e.g. to mark `sold`). This stops a buggy/malicious client from silently creating hidden `draft` listings by accident.

**Design call — `is_vetted`**: same defensive pattern as `status`. There's no `is_vetted` field in `VehicleCreate` or `VehicleUpdate` at all — a client can never set it, no matter what they send. It's computed purely server-side in the service layer (2.4): if the account creating the vehicle is the one designated `COMPANY_ACCOUNT_EMAIL` (already added to `app/core/config.py` in phase 1's `Settings`), the vehicle is `is_vetted = True`; every other account always gets `False`. This is deliberately light — it does **not** model who inspected the car, when, or what they found. It just answers "is this one of AutoTrust's own vetted listings?" A real inspector-submits-a-report workflow is a separate, later phase (section 5) once individual sellers' cars need inspecting too.

**Design call — `features`**: a fixed checklist (`VehicleFeature` enum: `air_conditioning`, `power_steering`, `power_windows`, `anti_lock_brakes`, `airbags`, `bluetooth`, `navigation_system`, `backup_camera`, `parking_sensors`, `sunroof`, `leather_seats`, `heated_seats`, `cruise_control`, `alloy_wheels`, `keyless_entry`, `four_wheel_drive`, `usb_charging`, `third_row_seating`), not freeform text — a seller ticks which apply. Stored as a plain JSON array column rather than a separate many-to-many table: a join table is the "textbook" normalized design, but it's an extra table, an extra join, and an extra layer of code for something that's only ever read or written as one whole list per vehicle. A JSON array is enough here, and it maps directly onto a native array field once this moves to Firestore.

---

## 2. File-by-file build order

### 2.1 `app/models/vehicle.py`

Defines the DB table shape, and the two enums (shared by the model and the schemas, so validation stays consistent everywhere).

```python
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

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
    location: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus), nullable=False, default=VehicleStatus.LISTED
    )
    is_vetted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Plain JSON array of feature-enum values (e.g. ["bluetooth", "sunroof"]).
    # Unlike condition/status, this column has no built-in enum handling
    # (JSON just serializes whatever Python object it's given), so the
    # service layer converts VehicleFeature members to their .value strings
    # before storing — see 2.4.
    features: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

**Why `ForeignKey("users.id")`**: this is the DB-level version of "this vehicle belongs to that user." We're deliberately *not* adding a SQLAlchemy `relationship()` (which would let you write `vehicle.owner` and get the full `User` object automatically) — that's a real feature but an extra concept; for now `owner_id` plus a manual lookup is enough.

**Why `Uuid(as_uuid=True)` matches `User.id`**: `owner_id` has to be the same column type as the `users.id` it points to. `User.id` was changed from an auto-increment int to a UUID after phase 1, so `owner_id` and `Vehicle.id` follow that same pattern here — not sequential/guessable ids.

**Verify**: no runtime check yet — just confirm the file has no typos by importing it in Step 2.6.

---

### 2.2 `app/schemas/vehicle.py`

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.vehicle import VehicleCondition, VehicleFeature, VehicleStatus


class VehicleCreate(BaseModel):
    vin: str = Field(min_length=5, max_length=32)
    make: str
    model: str
    year: int = Field(ge=1980, le=2100)
    mileage: int = Field(ge=0)
    price: float = Field(gt=0)
    condition: VehicleCondition
    location: str
    description: str
    features: list[VehicleFeature] = Field(default_factory=list)


class VehicleUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    year: int | None = Field(default=None, ge=1980, le=2100)
    mileage: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)
    condition: VehicleCondition | None = None
    location: str | None = None
    description: str | None = None
    status: VehicleStatus | None = None
    features: list[VehicleFeature] | None = None


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
    location: str
    description: str
    status: VehicleStatus
    is_vetted: bool
    features: list[VehicleFeature]
    created_at: datetime
    updated_at: datetime
```

Notice `is_vetted` appears in `VehicleRead` (so clients can see it) but not in `VehicleCreate` or `VehicleUpdate` (so no client can ever set it) — same principle as `hashed_password` never appearing on `UserRead` in phase 1, just inverted: there, a field was hidden from *output*; here, a field is hidden from *input*. `features` is different again — it's writable (appears in all three schemas), but every value in the list is validated against the fixed `VehicleFeature` enum, so a client can tick any of the known features but can't smuggle in arbitrary text.

**Why `VehicleUpdate` fields are all `| None = None`**: this is a **partial update** (PATCH) schema — the client only sends the fields they're changing. In the service layer (2.4) we'll read `.model_dump(exclude_unset=True)` to know exactly which fields the client actually sent, versus ones that are `None` just because they were omitted.

**Verify**: still just an import check, same as above.

---

### 2.3 `app/repositories/vehicle_repository.py`

Same job as `user_repository.py` in phase 1 — the only file that queries the `Vehicle` table directly.

```python
import uuid

from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle, VehicleStatus


def get_vehicle_by_id(db: Session, vehicle_id: uuid.UUID) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def get_vehicle_by_vin(db: Session, vin: str) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.vin == vin).first()


def list_vehicles(db: Session, status: VehicleStatus | None = None) -> list[Vehicle]:
    query = db.query(Vehicle)
    if status is not None:
        query = query.filter(Vehicle.status == status)
    return query.order_by(Vehicle.created_at.desc()).all()


def list_vehicles_by_owner(db: Session, owner_id: uuid.UUID) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id)
        .order_by(Vehicle.created_at.desc())
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


def delete_vehicle(db: Session, vehicle: Vehicle) -> None:
    db.delete(vehicle)
    db.commit()
```

**Verify**: import check only, same pattern.

---

### 2.4 `app/services/vehicle_service.py`

Business rules live here: VIN uniqueness, "does this vehicle exist," and the ownership check.

```python
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.repositories import vehicle_repository
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleNotFoundError(Exception):
    pass


class VinAlreadyRegisteredError(Exception):
    pass


class NotVehicleOwnerError(Exception):
    pass


def create_vehicle(db: Session, owner: User, vehicle_in: VehicleCreate) -> Vehicle:
    if vehicle_repository.get_vehicle_by_vin(db, vehicle_in.vin):
        raise VinAlreadyRegisteredError(vehicle_in.vin)
    data = vehicle_in.model_dump()
    data["is_vetted"] = owner.email.lower() == settings.COMPANY_ACCOUNT_EMAIL.lower()
    # features is a plain JSON column, not a SQLAlchemy Enum column like
    # condition/status, so it has no built-in enum handling — store plain
    # string values ourselves rather than raw VehicleFeature members.
    data["features"] = [feature.value for feature in vehicle_in.features]
    return vehicle_repository.create_vehicle(db, owner_id=owner.id, data=data)


def list_public_vehicles(db: Session) -> list[Vehicle]:
    return vehicle_repository.list_vehicles(db, status=VehicleStatus.LISTED)


def list_my_vehicles(db: Session, owner: User) -> list[Vehicle]:
    return vehicle_repository.list_vehicles_by_owner(db, owner.id)


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
    return vehicle_repository.update_vehicle(db, vehicle, update_data)


def delete_vehicle(db: Session, vehicle_id: uuid.UUID, current_user: User) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.owner_id != current_user.id:
        raise NotVehicleOwnerError(vehicle_id)
    vehicle_repository.delete_vehicle(db, vehicle)
```

**Why exceptions instead of raising `HTTPException` here**: same pattern as `EmailAlreadyRegisteredError` in phase 1 — the service layer doesn't know about HTTP at all, it just raises plain Python exceptions. The router (next file) is what translates those into HTTP status codes. This keeps `vehicle_service.py` reusable even if you ever expose vehicles a non-HTTP way (a CLI script, a background job).

**Why `is_vetted` is decided here, not in the router or the model**: the router just passes along whatever `VehicleCreate` it received — it has no idea about "the company account" concept. The model can't decide it either — a `default=False` on the column doesn't know who's creating the row. The service layer is the one place that has both the `owner` (a `User`, so `owner.email` is available) and the business rule (`settings.COMPANY_ACCOUNT_EMAIL`), so that's where the decision belongs.

**Why `features` needs the `[feature.value for feature in ...]` conversion but `condition`/`status` don't**: `condition` and `status` are backed by `SAEnum` columns, which know how to accept and return actual `VehicleCondition`/`VehicleStatus` members directly — that's their whole job. `features` is backed by a plain `JSON` column, which has no idea what a `VehicleFeature` is; it just serializes whatever Python object you hand it. Left alone, `model_dump()` would hand it a list of enum *members*, and depending on Python version that can serialize unpredictably. Converting to `.value` strings first guarantees the JSON column always stores plain, predictable strings like `"sunroof"`.

**Verify**: import check only.

---

### 2.5 `app/routers/vehicles.py`

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from app.services import vehicle_service
from app.services.vehicle_service import (
    NotVehicleOwnerError,
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
def list_vehicles(db: Session = Depends(get_db)):
    return vehicle_service.list_public_vehicles(db)


@router.get("/mine", response_model=list[VehicleRead])
def list_my_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return vehicle_service.list_my_vehicles(db, current_user)


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
```

**Gotcha — route order matters**: `GET /vehicles/mine` **must** be defined before `GET /vehicles/{vehicle_id}`. FastAPI matches routes top-to-bottom; if `/{vehicle_id}` (which expects a `uuid.UUID`) came first, a request to `/vehicles/mine` would try to match it, fail to parse `"mine"` as a UUID, and return a confusing `422` instead of reaching your `/mine` route. The file above already has the right order — just don't reorder it later without remembering this.

**Verify**: import check only — real testing happens after wiring in `main.py`.

---

### 2.6 Wire it into `app/main.py`

Open your existing `app/main.py` and:

1. Add an import so `Vehicle` gets registered on `Base.metadata` (same reason `from app.models import user` is already there):
   ```python
   from app.models import vehicle  # noqa: F401 - import registers the model on Base.metadata
   ```
2. Import and include the new router, same way `auth.router` is included:
   ```python
   from app.routers import vehicles
   ...
   app.include_router(vehicles.router)
   ```

**Verify**: from `backend/`, with the venv active, run:
```bash
python -c "from app.main import app; print('import ok')"
```
If that prints `import ok`, every file above is syntactically correct and wired together. If it errors, that's your first debugging checkpoint — send me the traceback.

---

## 3. End-to-end test checklist

Start the server (`uvicorn app.main:app --reload`) and work through this in `/docs`, or with `curl`. Use the same register/login flow from phase 1 to get a token for **two different users** (you'll need a second account to test the ownership check).

1. **Register/login two users** — `alice@example.com` and `bob@example.com`. Save both tokens.
2. **Create a vehicle as Alice** (`POST /vehicles`, `Authorization: Bearer <alice's token>`) — expect `201` and `status: "listed"` even though you didn't send `status`.
3. **Create a vehicle with the same VIN again** — expect `409`.
4. **List public vehicles** (`GET /vehicles`, no auth header) — expect Alice's vehicle to appear.
5. **Get it by id** (`GET /vehicles/{id}`, no auth header) — expect `200`.
6. **List "mine" as Alice** (`GET /vehicles/mine`, Alice's token) — expect her vehicle.
7. **List "mine" as Bob** (`GET /vehicles/mine`, Bob's token) — expect an empty list.
8. **Bob tries to update Alice's vehicle** (`PATCH /vehicles/{id}`, Bob's token, e.g. `{"price": 1}`) — expect `403`.
9. **Alice updates her own vehicle** (`PATCH /vehicles/{id}`, Alice's token, e.g. `{"status": "sold"}`) — expect `200` with the new status.
10. **Confirm it drops off the public list**: `GET /vehicles` again — the now-`sold` vehicle should no longer appear (since public listing filters to `status == listed`).
11. **Bob tries to delete Alice's vehicle** — expect `403`.
12. **Alice deletes her own vehicle** — expect `204`, then `GET /vehicles/{id}` — expect `404`.
13. **Try creating a vehicle with an invalid `year`** (e.g. `1800`) — expect `422` (Pydantic's automatic validation from the `Field(ge=1980, ...)` constraint).
14. **Register/login the company account** — whatever email you put in `.env`'s `COMPANY_ACCOUNT_EMAIL` (the placeholder is `company@autotrust.com`; use a real-looking domain — a reserved one like `.local`/`.test`/`.example` will fail `EmailStr` validation).
15. **Create a vehicle as the company account** — expect `is_vetted: true` in the response, with no `is_vetted` field sent in the request.
16. **Create a vehicle as Alice again** — expect `is_vetted: false`.
17. **Create a vehicle with `"features": ["air_conditioning", "sunroof", "bluetooth"]`** — expect those three back in the response, in order.
18. **Create a vehicle with no `features` field at all** — expect `"features": []` (the default).
19. **Create a vehicle with `"features": ["heated_mirrors"]`** (not a real option) — expect `422`.
20. **`PATCH` a vehicle's `features` to a different list** — expect the response (and a follow-up `GET`) to show the *new* list, not the old one merged with it — this is a full replace, not an append.

If every step matches its expected result, phase 2 is done.

---

## 4. Troubleshooting cheat-sheet

| Symptom | Likely cause |
|---|---|
| `ImportError` / `ModuleNotFoundError` on startup | Typo in an import path, or forgot an `__init__.py` — but you already have those from phase 1, so check the import line itself |
| `sqlalchemy.exc.OperationalError: no such column` | You changed a model after `app.db` already existed with the old schema. Phase 1/2 use `create_all()`, not migrations, so it **only creates tables that don't exist yet** — it won't alter an existing one. Fix: stop the server, delete `backend/app.db`, restart (this wipes local test data, which is fine at this stage) |
| `422 Unprocessable Entity` on a request you expected to succeed | Check the response body — Pydantic tells you exactly which field failed and why. Usually a missing field or wrong enum value (e.g. `"condition": "Good"` instead of `"good"` — enums are case-sensitive) |
| `403` when you expected `200` | You're using the wrong user's token, or testing against a vehicle owned by someone else |
| `/vehicles/mine` returns a `422` about `vehicle_id` | The route ordering gotcha above — `/mine` got defined after `/{vehicle_id}` |
| Registering the company account gives `422`: `"...special-use or reserved name..."` | `COMPANY_ACCOUNT_EMAIL` in `.env` uses a reserved TLD (`.local`, `.test`, `.example`, `.invalid`, `.localhost`) — `email-validator` rejects those on purpose. Use a normal-looking domain instead, e.g. `company@autotrust.com` |
| Company account's vehicle comes back `is_vetted: false` | Check `.env`'s `COMPANY_ACCOUNT_EMAIL` matches the email you actually registered with, exactly (the comparison is case-insensitive but everything else must match) |
| `features` comes back empty after a `PATCH` that only meant to change something else | You sent `"features": []` (or omitted logic elsewhere caused it) — remember `VehicleUpdate` replaces the whole list when `features` is present in the request at all, it doesn't merge. Only include `features` in a `PATCH` body when you actually mean to replace it |
| `sqlite3.ProgrammingError` or weird garbage in a `features` column when inspecting `app.db` directly with a SQLite browser | Expected — `JSON` columns store a JSON-encoded string under the hood (e.g. `["sunroof", "bluetooth"]` as text). SQLAlchemy decodes it back to a Python list automatically when you query through the ORM; it only looks odd if you bypass the ORM and read the raw file |

If you hit something not on this list: paste the exact request you sent, the response/error you got, and which numbered step in the guide you were on.

---

## 5. What's next (after this phase works)

Inspections next — an `Inspection` links a `Vehicle` to an inspector and produces a report; it reuses this same five-layer pattern again.
