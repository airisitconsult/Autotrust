"""Buyer <-> seller conversations about a car.

Messages go through AutoTrust and each side sees only a masked version of the
other's email, so deals stay on the platform (which is also what the sale and
the 5% fee depend on).
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core import email as email_sender
from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter
from app.models.enquiry import Enquiry
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.repositories import enquiry_repository, user_repository, vehicle_repository
from app.schemas.enquiry import (
    EnquiryDetail,
    EnquiryMessageRead,
    EnquirySummary,
    VehicleBrief,
)

logger = logging.getLogger("uvicorn.error")

NEW_THREADS_PER_DAY = 10
MESSAGES_PER_HOUR = 30
_message_limiter = SlidingWindowLimiter()


class EnquiryNotFoundError(Exception):
    pass


class CannotEnquireError(Exception):
    """A rule was broken; the message is user-facing."""


class TooManyMessagesError(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after


def mask_email(address: str) -> str:
    local, _, domain = address.partition("@")
    return f"{local[:1]}***@{domain}" if domain else "user"


def _brief(vehicle: Vehicle) -> VehicleBrief:
    gallery = vehicle.gallery_photos
    cover = gallery[0] if gallery else None
    return VehicleBrief(
        id=vehicle.id,
        title=f"{vehicle.year} {vehicle.make} {vehicle.model}",
        price=vehicle.price,
        status=vehicle.status,
        location=f"{vehicle.lga}, {vehicle.state}",
        thumb_url=cover.thumb_url if cover else None,
    )


def _is_unread(enquiry: Enquiry, user_id: uuid.UUID) -> bool:
    if enquiry.last_message_sender_id in (None, user_id):
        return False
    read_at = enquiry.buyer_last_read_at if user_id == enquiry.buyer_id else enquiry.seller_last_read_at
    return read_at is None or read_at < enquiry.last_message_at


def _summary(db: Session, enquiry: Enquiry, viewer: User) -> EnquirySummary:
    vehicle = vehicle_repository.get_vehicle_by_id(db, enquiry.vehicle_id)
    other_id = enquiry.seller_id if viewer.id == enquiry.buyer_id else enquiry.buyer_id
    other = user_repository.get_user_by_id(db, other_id)
    return EnquirySummary(
        id=enquiry.id,
        vehicle=_brief(vehicle),
        my_role="buyer" if viewer.id == enquiry.buyer_id else "seller",
        counterparty=mask_email(other.email) if other else "user",
        last_message_preview=enquiry.last_message_preview,
        last_message_at=enquiry.last_message_at,
        unread=_is_unread(enquiry, viewer.id),
    )


def _detail(db: Session, enquiry: Enquiry, viewer: User) -> EnquiryDetail:
    base = _summary(db, enquiry, viewer)
    return EnquiryDetail(
        **base.model_dump(),
        messages=[
            EnquiryMessageRead(
                id=m.id,
                sender="buyer" if m.sender_id == enquiry.buyer_id else "seller",
                mine=m.sender_id == viewer.id,
                body=m.body,
                created_at=m.created_at,
            )
            for m in enquiry.messages
        ],
    )


def _notify(db: Session, enquiry: Enquiry, sender: User, vehicle: Vehicle, body: str, new: bool) -> None:
    """Email the other party. Best effort — never blocks the message."""
    try:
        other_id = enquiry.seller_id if sender.id == enquiry.buyer_id else enquiry.buyer_id
        other = user_repository.get_user_by_id(db, other_id)
        if other is None:
            return
        title = f"{vehicle.year} {vehicle.make} {vehicle.model}"
        link = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/enquiries/{enquiry.id}"
        subject = f"New enquiry about your {title}" if new else f"New message about the {title}"
        text = (
            f"{mask_email(sender.email)} wrote:\n\n\"{body[:300]}\"\n\n"
            f"Read and reply on AutoTrust:\n{link}"
        )
        email_sender.send_email(other.email, subject, text)
    except Exception:
        logger.warning("Could not send enquiry notification", exc_info=True)


def start_enquiry(db: Session, buyer: User, vehicle_id: uuid.UUID, message: str) -> EnquiryDetail:
    vehicle = vehicle_repository.get_vehicle_by_id(db, vehicle_id)
    if vehicle is None or vehicle.status != VehicleStatus.LISTED:
        raise CannotEnquireError("This car is no longer available for enquiries.")
    if vehicle.owner_id == buyer.id:
        raise CannotEnquireError("You can't send an enquiry about your own car.")

    retry = _message_limiter.hit(f"msg:{buyer.id}", MESSAGES_PER_HOUR, 3600)
    if retry is not None:
        raise TooManyMessagesError(retry)

    thread = enquiry_repository.get_thread(db, vehicle_id, buyer.id)
    new = thread is None
    if new:
        day_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)
        if enquiry_repository.count_new_threads_since(db, buyer.id, day_ago) >= NEW_THREADS_PER_DAY:
            raise CannotEnquireError(
                f"You can start at most {NEW_THREADS_PER_DAY} new enquiries a day. Try again tomorrow."
            )
        thread = enquiry_repository.create_enquiry(db, vehicle_id, buyer.id, vehicle.owner_id)
    enquiry_repository.add_message(db, thread, buyer.id, message)
    _notify(db, thread, buyer, vehicle, message, new)
    return _detail(db, thread, buyer)


def reply(db: Session, user: User, enquiry_id: uuid.UUID, body: str) -> EnquiryDetail:
    enquiry = enquiry_repository.get_enquiry(db, enquiry_id)
    if enquiry is None or user.id not in (enquiry.buyer_id, enquiry.seller_id):
        raise EnquiryNotFoundError(enquiry_id)
    retry = _message_limiter.hit(f"msg:{user.id}", MESSAGES_PER_HOUR, 3600)
    if retry is not None:
        raise TooManyMessagesError(retry)
    vehicle = vehicle_repository.get_vehicle_by_id(db, enquiry.vehicle_id)
    enquiry_repository.add_message(db, enquiry, user.id, body)
    if vehicle is not None:
        _notify(db, enquiry, user, vehicle, body, new=False)
    return _detail(db, enquiry, user)


def list_enquiries(db: Session, user: User, limit: int = 50, offset: int = 0) -> list[EnquirySummary]:
    return [
        _summary(db, e, user) for e in enquiry_repository.list_for_user(db, user.id, limit, offset)
    ]


def get_enquiry(db: Session, user: User, enquiry_id: uuid.UUID) -> EnquiryDetail:
    enquiry = enquiry_repository.get_enquiry(db, enquiry_id)
    # Strangers get the same "not found" as a missing id: don't reveal that it exists.
    if enquiry is None or user.id not in (enquiry.buyer_id, enquiry.seller_id):
        raise EnquiryNotFoundError(enquiry_id)
    enquiry_repository.mark_read(db, enquiry, user.id)
    return _detail(db, enquiry, user)


def unread_count(db: Session, user: User) -> int:
    return sum(1 for e in enquiry_repository.list_for_user(db, user.id, limit=200) if _is_unread(e, user.id))
