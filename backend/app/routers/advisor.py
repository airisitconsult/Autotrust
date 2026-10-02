from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import advisor_limiter
from app.db.session import get_db
from app.dependencies import get_optional_user
from app.models.user import User
from app.schemas.advisor import AdvisorRequest, AdvisorResponse
from app.services import advisor_service

router = APIRouter(prefix="/advisor", tags=["advisor"])

_WINDOW_SECONDS = 3600


@router.post("/recommend", response_model=AdvisorResponse)
def recommend(
    payload: AdvisorRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """One turn of the buyer chat: send the recent conversation (ending with
    the buyer's new message), get the assistant's next reply, plus matching
    listings once it knows enough.

    Open to everyone, but each call is a paid AI request, so it's rate
    limited: per account when logged in (higher limit), per IP address when
    not. Every attempt counts, including ones where the AI fails.
    """
    if user is not None:
        key, limit = f"user:{user.id}", settings.ADVISOR_USER_LIMIT_PER_HOUR
    else:
        host = request.client.host if request.client else "unknown"
        key, limit = f"ip:{host}", settings.ADVISOR_ANON_LIMIT_PER_HOUR

    retry_after = advisor_limiter.hit(key, limit, _WINDOW_SECONDS)
    if retry_after is not None:
        minutes = max(1, round(retry_after / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"You've used all {limit} advisor requests for this hour. "
                f"Please try again in about {minutes} minute{'s' if minutes != 1 else ''}."
                + (" Log in for a higher limit." if user is None else "")
            ),
            headers={"Retry-After": str(retry_after)},
        )
    return advisor_service.recommend(db, payload.messages)
