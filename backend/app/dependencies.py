from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import Permission, User, UserRole
from app.repositories import user_repository

# HTTPBearer (not OAuth2PasswordBearer) because our /auth/login takes a JSON
# body (email/password), not OAuth2's form-encoded username/password. This
# makes the /docs "Authorize" button show one plain "paste your token" field
# that matches how login actually works here, instead of a form that would
# submit to /auth/login in a shape it doesn't accept.
_bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Shared dependency for any protected route: decodes the bearer token,
    loads the corresponding user, or raises 401 if anything doesn't check out.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise credentials_error

    email = payload.get("sub")
    if email is None:
        raise credentials_error

    user = user_repository.get_user_by_email(db, email)
    if user is None:
        raise credentials_error

    return user


_optional_bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """For endpoints open to everyone that behave better for a known user
    (e.g. a higher rate limit). A missing or invalid token just means
    anonymous — it never raises."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    email = payload.get("sub") if payload else None
    return user_repository.get_user_by_email(db, email) if email else None


def require_verified_user(current_user: User = Depends(get_current_user)) -> User:
    """For actions with consequences (listing, enquiring, buying): the user
    must have confirmed their email address."""
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address first. Check your inbox for the link.",
        )
    return current_user


def require_seller(current_user: User = Depends(require_verified_user)) -> User:
    """Listing a car needs a verified seller account (or the company's own
    account). Buyers can switch to a seller account with /auth/become-seller."""
    if current_user.role not in (UserRole.SELLER, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only seller accounts can list cars. Switch to a seller account first.",
        )
    return current_user


def has_permission(user: User, permission: Permission) -> bool:
    """The super admin holds every permission; a major admin only those the
    super admin granted; nobody else has any."""
    return user.can(permission)


def _forbidden() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to perform this action",
    )


def require_permission(permission: Permission):
    """Dependency factory: current user must hold `permission` (see
    has_permission). Usage: `Depends(require_permission(Permission.MANAGE_USERS))`.
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, permission):
            raise _forbidden()
        return current_user

    return dependency


def require_inspection_access(current_user: User = Depends(get_current_user)) -> User:
    """Inspectors do inspections by role; admins need MANAGE_INSPECTIONS."""
    if current_user.role == UserRole.INSPECTOR or has_permission(
        current_user, Permission.MANAGE_INSPECTIONS
    ):
        return current_user
    raise _forbidden()


def require_role(*allowed_roles: UserRole):
    """Dependency factory: builds a dependency that requires the current user
    to hold one of the given roles, on top of just being logged in. Usage:
    `current_user: User = Depends(require_role(UserRole.ADMIN))`.
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise _forbidden()
        return current_user

    return dependency
