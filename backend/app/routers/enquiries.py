import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user, require_verified_user
from app.models.user import User
from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryDetail,
    EnquirySummary,
    MessageCreate,
    UnreadCount,
)
from app.services import enquiry_service
from app.services.enquiry_service import (
    CannotEnquireError,
    EnquiryNotFoundError,
    TooManyMessagesError,
)

router = APIRouter(prefix="/enquiries", tags=["enquiries"])


def _too_many(exc: TooManyMessagesError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="You're sending messages too quickly. Please wait a little while.",
        headers={"Retry-After": str(exc.retry_after)},
    )


@router.post("", response_model=EnquiryDetail, status_code=status.HTTP_201_CREATED)
def start_enquiry(
    payload: EnquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verified_user),
):
    """Ask the seller about a car. If you've already enquired about it, the
    message is added to the same conversation."""
    try:
        return enquiry_service.start_enquiry(db, current_user, payload.vehicle_id, payload.message)
    except CannotEnquireError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except TooManyMessagesError as exc:
        raise _too_many(exc)


@router.get("", response_model=list[EnquirySummary])
def list_enquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Your conversations, as buyer and as seller, newest first."""
    return enquiry_service.list_enquiries(db, current_user, limit, offset)


# Registered before /{enquiry_id} so "unread-count" isn't read as an id.
@router.get("/unread-count", response_model=UnreadCount)
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return UnreadCount(unread=enquiry_service.unread_count(db, current_user))


@router.get("/{enquiry_id}", response_model=EnquiryDetail)
def get_enquiry(
    enquiry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return enquiry_service.get_enquiry(db, current_user, enquiry_id)
    except EnquiryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@router.post("/{enquiry_id}/messages", response_model=EnquiryDetail, status_code=status.HTTP_201_CREATED)
def send_message(
    enquiry_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return enquiry_service.reply(db, current_user, enquiry_id, payload.body)
    except EnquiryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    except TooManyMessagesError as exc:
        raise _too_many(exc)
