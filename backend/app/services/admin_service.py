"""The super admin's team management: creating major-admin accounts and
deciding what each may do."""

import uuid

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import Permission, User, UserRole
from app.repositories import user_repository
from app.schemas.user import MajorAdminCreate
from app.services.auth_service import EmailAlreadyRegisteredError, UserNotFoundError, is_reserved_email


class NotAMajorAdminError(Exception):
    """The target exists but isn't a major-admin account."""


class SuperAdminExistsError(Exception):
    """There is already a super admin — there can only ever be one."""


def create_super_admin(db: Session, email: str, password: str) -> User:
    """Create the one super admin, or promote an existing account to it
    (also setting its password). Not exposed through any HTTP endpoint — it's
    run once by a person with server access via
    `python -m app.scripts.create_super_admin`. The partial unique index on
    User is the backstop if this check ever races.
    """
    if user_repository.get_super_admin(db) is not None:
        raise SuperAdminExistsError()
    hashed = hash_password(password)
    existing = user_repository.get_user_by_email(db, email)
    if existing is None:
        return user_repository.create_user(db, email, hashed, UserRole.SUPER_ADMIN, email_verified=True)
    existing.hashed_password = hashed
    user_repository.mark_email_verified(db, existing)
    return user_repository.update_user_access(db, existing, UserRole.SUPER_ADMIN, [])


def _clean(permissions: list[Permission]) -> list[str]:
    # De-duplicate and store as plain values in a stable order.
    return sorted({p.value for p in permissions})


def create_major_admin(db: Session, payload: MajorAdminCreate) -> User:
    if is_reserved_email(payload.email) or user_repository.get_user_by_email(db, payload.email):
        raise EmailAlreadyRegisteredError(payload.email)
    return user_repository.create_user(
        db,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.ADMIN,
        permissions=_clean(payload.permissions),
        email_verified=True,  # the super admin vouches for this address
    )


def list_major_admins(db: Session) -> list[User]:
    return user_repository.list_users(db, role=UserRole.ADMIN, limit=100)


def _get_major_admin(db: Session, user_id: uuid.UUID) -> User:
    user = user_repository.get_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError(user_id)
    if user.role != UserRole.ADMIN:
        raise NotAMajorAdminError(user_id)
    return user


def set_major_admin_permissions(
    db: Session, user_id: uuid.UUID, permissions: list[Permission]
) -> User:
    user = _get_major_admin(db, user_id)
    return user_repository.update_user_access(db, user, UserRole.ADMIN, _clean(permissions))


def remove_major_admin(db: Session, user_id: uuid.UUID) -> None:
    """Revoke admin access. The account itself stays, as an ordinary buyer —
    deleting it could orphan listings and inspections that reference it.
    Takes effect immediately: roles are read from the database on every
    request, not baked into the login token.
    """
    user = _get_major_admin(db, user_id)
    user_repository.update_user_access(db, user, UserRole.BUYER, [])
