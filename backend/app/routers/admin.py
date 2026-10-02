import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import require_permission, require_role
from app.models.user import PERMISSION_DESCRIPTIONS, Permission, User, UserRole
from app.repositories import user_repository
from app.schemas.user import (
    MajorAdminCreate,
    PermissionInfo,
    PermissionsUpdate,
    RoleUpdate,
    UserRead,
)
from app.services import admin_service, auth_service
from app.services.admin_service import NotAMajorAdminError
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    ProtectedRoleError,
    UserNotFoundError,
)

router = APIRouter(prefix="/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Team management — SUPER ADMIN only. Major admins can't create each other,
# change permissions, or see this list.
# ---------------------------------------------------------------------------

_super_admin_only = require_role(UserRole.SUPER_ADMIN)


@router.get("/permissions", response_model=list[PermissionInfo])
def list_permissions(_: User = Depends(_super_admin_only)):
    return [
        PermissionInfo(value=p, description=PERMISSION_DESCRIPTIONS[p]) for p in Permission
    ]


@router.get("/major-admins", response_model=list[UserRead])
def list_major_admins(db: Session = Depends(get_db), _: User = Depends(_super_admin_only)):
    return admin_service.list_major_admins(db)


@router.post("/major-admins", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_major_admin(
    payload: MajorAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_super_admin_only),
):
    try:
        return admin_service.create_major_admin(db, payload)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )


@router.put("/major-admins/{user_id}/permissions", response_model=UserRead)
def set_major_admin_permissions(
    user_id: uuid.UUID,
    payload: PermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_super_admin_only),
):
    try:
        return admin_service.set_major_admin_permissions(db, user_id, payload.permissions)
    except (UserNotFoundError, NotAMajorAdminError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Major admin not found")


@router.delete("/major-admins/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_major_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(_super_admin_only),
):
    """Revokes admin access immediately; the account remains as a buyer."""
    try:
        admin_service.remove_major_admin(db, user_id)
    except (UserNotFoundError, NotAMajorAdminError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Major admin not found")


# ---------------------------------------------------------------------------
# User management — needs the MANAGE_USERS permission (the super admin always
# has it). Limited to ordinary accounts: it can't touch admins.
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[UserRead])
def list_users(
    q: str | None = Query(None, max_length=100, description="Email contains"),
    role: UserRole | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    return user_repository.list_users(db, q=q, role=role, limit=limit, offset=offset)


@router.patch("/users/{user_id}/role", response_model=UserRead)
def set_user_role(
    user_id: uuid.UUID,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    try:
        return auth_service.set_user_role(db, user_id, payload.role)
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    except ProtectedRoleError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts can only be managed by the super admin",
        )
