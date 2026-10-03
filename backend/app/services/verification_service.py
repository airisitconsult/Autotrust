"""Verifying that a user controls the email address they registered with."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core import email as email_sender
from app.core.config import settings
from app.models.user import User
from app.repositories import email_token_repository, user_repository

logger = logging.getLogger("uvicorn.error")

PURPOSE = "verify_email"


class InvalidTokenError(Exception):
    """The link is wrong, expired, or was already used."""


def _hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def send_verification_email(db: Session, user: User) -> bool:
    """Issue a fresh verification link and email it. Older links stop working.
    Returns whether the mail server accepted the message; never raises, because
    failing to send must not break registration."""
    if user.email_verified:
        return False
    try:
        raw = secrets.token_urlsafe(32)  # 256 bits of randomness
        email_token_repository.invalidate_unused(db, user.id, PURPOSE)
        expires = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TTL_HOURS)
        email_token_repository.create_token(db, user.id, PURPOSE, _hash(raw), expires)

        link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw}"
        hours = settings.EMAIL_VERIFICATION_TTL_HOURS
        text = (
            "Welcome to AutoTrust!\n\n"
            f"Confirm your email address to start listing, enquiring and buying:\n{link}\n\n"
            f"This link works for {hours} hours. If you didn't create an account, you can ignore this email."
        )
        html = (
            "<p>Welcome to <strong>AutoTrust</strong>!</p>"
            "<p>Confirm your email address to start listing, enquiring and buying:</p>"
            f'<p><a href="{link}" style="background:#2450dc;color:#fff;padding:12px 20px;'
            'border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Verify my email</a></p>'
            f"<p style=\"color:#65748f;font-size:13px\">Or paste this link into your browser:<br>{link}</p>"
            f"<p style=\"color:#65748f;font-size:13px\">This link works for {hours} hours. "
            "If you didn't create an account, you can ignore this email.</p>"
        )
        return email_sender.send_email(user.email, "Verify your AutoTrust email", text, html)
    except Exception:
        logger.warning("Could not issue a verification email for %s", user.email, exc_info=True)
        return False


def verify_email(db: Session, raw_token: str) -> User:
    token = email_token_repository.get_by_hash(db, _hash(raw_token), PURPOSE)
    if token is None:
        raise InvalidTokenError()
    user = user_repository.get_user_by_id(db, token.user_id)
    if user is None:
        raise InvalidTokenError()
    if user.email_verified:
        return user  # clicking the link twice is harmless
    if token.used_at is not None or token.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise InvalidTokenError()
    email_token_repository.mark_used(db, token)
    return user_repository.mark_email_verified(db, user)
