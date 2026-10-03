import uuid
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.enquiry import Enquiry, EnquiryMessage


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_enquiry(db: Session, enquiry_id: uuid.UUID) -> Enquiry | None:
    return db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()


def get_thread(db: Session, vehicle_id: uuid.UUID, buyer_id: uuid.UUID) -> Enquiry | None:
    return (
        db.query(Enquiry)
        .filter(Enquiry.vehicle_id == vehicle_id, Enquiry.buyer_id == buyer_id)
        .first()
    )


def list_for_user(db: Session, user_id: uuid.UUID, limit: int = 50, offset: int = 0) -> list[Enquiry]:
    return (
        db.query(Enquiry)
        .filter(or_(Enquiry.buyer_id == user_id, Enquiry.seller_id == user_id))
        .order_by(Enquiry.last_message_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_new_threads_since(db: Session, buyer_id: uuid.UUID, since: datetime) -> int:
    return db.query(Enquiry).filter(Enquiry.buyer_id == buyer_id, Enquiry.created_at >= since).count()


def create_enquiry(
    db: Session, vehicle_id: uuid.UUID, buyer_id: uuid.UUID, seller_id: uuid.UUID
) -> Enquiry:
    enquiry = Enquiry(vehicle_id=vehicle_id, buyer_id=buyer_id, seller_id=seller_id)
    db.add(enquiry)
    db.flush()
    return enquiry


def add_message(db: Session, enquiry: Enquiry, sender_id: uuid.UUID, body: str) -> EnquiryMessage:
    now = _now()
    message = EnquiryMessage(enquiry_id=enquiry.id, sender_id=sender_id, body=body, created_at=now)
    db.add(message)
    enquiry.last_message_at = now
    enquiry.last_message_sender_id = sender_id
    enquiry.last_message_preview = body[:120]
    # Sending a message means you've read the conversation up to now.
    if sender_id == enquiry.buyer_id:
        enquiry.buyer_last_read_at = now
    else:
        enquiry.seller_last_read_at = now
    db.commit()
    db.refresh(message)
    return message


def mark_read(db: Session, enquiry: Enquiry, user_id: uuid.UUID) -> None:
    now = _now()
    if user_id == enquiry.buyer_id:
        enquiry.buyer_last_read_at = now
    elif user_id == enquiry.seller_id:
        enquiry.seller_last_read_at = now
    db.commit()
