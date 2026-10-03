import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories import user_repository
from app.schemas.user import UserCreate


class EmailAlreadyRegisteredError(Exception):
    """Raised when registering with an email that's already taken."""


class UserNotFoundError(Exception):
    """Raised when an admin action targets a user id that doesn't exist."""


def is_reserved_email(email: str) -> bool:
    """The company account's address can't be claimed through public
    registration — it's created by the bootstrap script (see
    app/scripts/create_super_admin.py). Otherwise whoever registered it first
    would get the company's "vetted" listings (and, by default, the super
    admin account would be a race to register).
    """
    return email.lower() == settings.COMPANY_ACCOUNT_EMAIL.lower()


def register_user(db: Session, user_in: UserCreate) -> User:
    # Same error as a genuine duplicate, so this doesn't reveal which
    # addresses are reserved.
    if is_reserved_email(user_in.email) or user_repository.get_user_by_email(db, user_in.email):
        raise EmailAlreadyRegisteredError(user_in.email)
    hashed = hash_password(user_in.password)
    # Registration only ever yields a BUYER or SELLER. Privileged roles come
    # only from the super admin (see admin_service) or the bootstrap script.
    role = UserRole.SELLER if user_in.account_type == "seller" else UserRole.BUYER
    return user_repository.create_user(db, email=user_in.email, hashed_password=hashed, role=role)


class CannotBecomeSellerError(Exception):
    """Only buyer accounts switch to seller (staff and inspectors can't)."""


def become_seller(db: Session, user: User) -> User:
    if user.role == UserRole.SELLER:
        return user
    if user.role != UserRole.BUYER:
        raise CannotBecomeSellerError(user.role)
    return user_repository.update_user_role(db, user, UserRole.SELLER)


class ProtectedRoleError(Exception):
    """Raised when a role change targets an admin/super-admin account."""


def set_user_role(db: Session, user_id: uuid.UUID, role: UserRole) -> User:
    user = user_repository.get_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError(user_id)
    # Admin and super-admin accounts are managed only through the super
    # admin's team endpoints, never by this ordinary role switch.
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ProtectedRoleError(user_id)
    return user_repository.update_user_role(db, user, role)


# A fixed dummy hash to compare against when no user is found, so a login
# attempt against a nonexistent email takes the same amount of time as one
# against a real email with a wrong password. Without this, "user not found"
# skips the slow bcrypt comparison entirely and returns fast — timing that's
# measurably different from a real account, which lets an attacker script
# login attempts to discover which emails are registered.
_DUMMY_HASH = hash_password("dummy-password-for-constant-time-comparison")


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = user_repository.get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
