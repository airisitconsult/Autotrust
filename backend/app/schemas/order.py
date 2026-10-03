import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models.order import OrderStatus
from app.schemas.enquiry import VehicleBrief
from app.schemas.user import BankDetails

Short = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=300)]


class OrderCreate(BaseModel):
    vehicle_id: uuid.UUID


class PaymentSubmit(BaseModel):
    """What the buyer tells us after making the bank transfer."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"payer_name": "Ada Obi", "bank_reference": "TRF/2026/10/03/884211", "note": "Paid from GTBank"}
            ]
        }
    )

    payer_name: Short
    bank_reference: Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)] | None = None
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] | None = None


class ReasonBody(BaseModel):
    reason: Reason


class PayoutBody(BaseModel):
    payout_reference: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=80)]


class PayTo(BaseModel):
    """Shown to the buyer: where to send the money and what to write on it."""

    bank_name: str
    account_number: str
    account_name: str
    amount: float
    currency: str
    reference: str


class PaymentProof(BaseModel):
    payer_name: str | None
    bank_reference: str | None
    note: str | None
    submitted_at: datetime | None
    rejected_reason: str | None


class OrderRead(BaseModel):
    id: uuid.UUID
    reference: str
    status: OrderStatus
    vehicle: VehicleBrief
    # The viewer's side of the deal.
    my_role: Literal["buyer", "seller", "staff"]
    currency: str
    price: float
    platform_fee: float
    seller_payout: float
    buyer: str  # masked email (full email for payment staff)
    seller: str

    pay_to: PayTo | None = None  # buyer only, while payment is still due
    payment: PaymentProof | None = None  # buyer and staff
    seller_bank: BankDetails | None = None  # payment staff only
    payout_reference: str | None = None
    cancel_reason: str | None = None

    created_at: datetime
    expires_at: datetime
    payment_submitted_at: datetime | None = None
    paid_at: datetime | None = None
    delivered_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None

    # What the viewer can do next, so the UI doesn't have to re-implement the rules.
    actions: list[str] = []
