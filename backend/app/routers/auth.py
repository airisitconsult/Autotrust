from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.dependencies import get_current_user
from app.repositories import user_repository
from app.models.user import User
from app.core.rate_limit import SlidingWindowLimiter
from app.schemas.user import BankDetails, Token, UserCreate, UserLogin, UserRead, VerifyEmailRequest
from app.services import auth_service, verification_service
from app.services.auth_service import CannotBecomeSellerError, EmailAlreadyRegisteredError
from app.services.verification_service import InvalidTokenError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(db, user_in)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    # Best effort: if the mail can't be sent, they can request another link.
    verification_service.send_verification_email(db, user)
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-email", response_model=UserRead)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Confirm an email address using the token from the emailed link. Public:
    the token itself is the proof."""
    try:
        return verification_service.verify_email(db, payload.token)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired. Request a new one.",
        )


_resend_limiter = SlidingWindowLimiter()


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
def resend_verification(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Email a fresh verification link to the logged-in user (3 per hour)."""
    if current_user.email_verified:
        return {"already_verified": True, "sent": False}
    retry_after = _resend_limiter.hit(f"verify:{current_user.id}", limit=3, window_seconds=3600)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification emails requested. Please try again in a little while.",
            headers={"Retry-After": str(retry_after)},
        )
    sent = verification_service.send_verification_email(db, current_user)
    return {"already_verified": False, "sent": sent}


@router.post("/become-seller", response_model=UserRead)
def become_seller(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Switch a buyer account to a seller account (so it can list cars)."""
    try:
        return auth_service.become_seller(db, current_user)
    except CannotBecomeSellerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyer accounts can switch to a seller account.",
        )


@router.get("/me/bank-details", response_model=BankDetails | None)
def get_bank_details(current_user: User = Depends(get_current_user)):
    """Your saved payout account, or null. Only ever returned to you."""
    if not current_user.has_bank_details:
        return None
    return BankDetails(
        bank_name=current_user.bank_name,
        account_number=current_user.bank_account_number,
        account_name=current_user.bank_account_name,
    )


@router.put("/me/bank-details", response_model=UserRead)
def set_bank_details(
    payload: BankDetails,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Where AutoTrust should send your share (95%) after you sell a car."""
    return user_repository.update_bank_details(
        db, current_user, payload.bank_name.strip(), payload.account_number, payload.account_name.strip()
    )
