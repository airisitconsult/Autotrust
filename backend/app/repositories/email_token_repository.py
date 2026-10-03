import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.email_token import EmailToken


def create_token(
    db: Session, user_id: uuid.UUID, purpose: str, token_hash: str, expires_at: datetime
) -> EmailToken:
    token = EmailToken(user_id=user_id, purpose=purpose, token_hash=token_hash, expires_at=expires_at)
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_by_hash(db: Session, token_hash: str, purpose: str) -> EmailToken | None:
    return (
        db.query(EmailToken)
        .filter(EmailToken.token_hash == token_hash, EmailToken.purpose == purpose)
        .first()
    )


def mark_used(db: Session, token: EmailToken) -> None:
    token.used_at = datetime.now(timezone.utc)
    db.commit()


def invalidate_unused(db: Session, user_id: uuid.UUID, purpose: str) -> None:
    """Retire every outstanding token of this kind (a newer one replaces them)."""
    now = datetime.now(timezone.utc)
    db.query(EmailToken).filter(
        EmailToken.user_id == user_id, EmailToken.purpose == purpose, EmailToken.used_at.is_(None)
    ).update({EmailToken.used_at: now})
    db.commit()
