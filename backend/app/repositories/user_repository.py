import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import User, UserRole

"""DB access for users. This is the only file that talks to the User ORM
model directly — services call these functions instead of writing queries
themselves. If SQLite is later swapped for Firestore, only this file (and
session.py) needs a new implementation.
"""


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_super_admin(db: Session) -> User | None:
    return db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()


def create_user(
    db: Session,
    email: str,
    hashed_password: str,
    role: UserRole,
    permissions: list[str] | None = None,
    email_verified: bool = False,
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        role=role,
        permissions=permissions or [],
        email_verified_at=datetime.now(timezone.utc) if email_verified else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_role(db: Session, user: User, role: UserRole) -> User:
    user.role = role
    db.commit()
    db.refresh(user)
    return user


def update_user_access(
    db: Session, user: User, role: UserRole, permissions: list[str]
) -> User:
    user.role = role
    user.permissions = permissions
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session,
    q: str | None = None,
    role: UserRole | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[User]:
    query = db.query(User)
    if q:
        query = query.filter(User.email.ilike(f"%{q}%"))
    if role is not None:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()


def mark_email_verified(db: Session, user: User) -> User:
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
    return user


def update_bank_details(
    db: Session, user: User, bank_name: str, account_number: str, account_name: str
) -> User:
    user.bank_name = bank_name
    user.bank_account_number = account_number
    user.bank_account_name = account_name
    db.commit()
    db.refresh(user)
    return user
