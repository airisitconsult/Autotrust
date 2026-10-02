import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Permission, UserRole


class UserCreate(BaseModel):
    """Request body for POST /auth/register."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"email": "buyer@example.com", "password": "supersecret123"}]
        }
    )

    email: EmailStr
    # bcrypt has a hard 72-byte limit and silently truncates anything longer
    # instead of erroring — capping here turns that into an explicit 422.
    password: str = Field(max_length=72)


class UserRead(BaseModel):
    """Response body for register/me. No hashed_password field exists here,
    so it can never be serialized back to the client even by mistake.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    role: UserRole
    # Granted permissions (major admins). The super admin holds all of them
    # implicitly, so this is empty for that account.
    permissions: list[Permission] = []
    created_at: datetime


class RoleUpdate(BaseModel):
    """Request body for PATCH /admin/users/{user_id}/role. Only the ordinary
    roles can be assigned here — ADMIN is created through /admin/major-admins
    and SUPER_ADMIN can't be assigned through the API at all.
    """

    model_config = ConfigDict(json_schema_extra={"examples": [{"role": "inspector"}]})

    role: Literal[UserRole.BUYER, UserRole.SELLER, UserRole.INSPECTOR]


class MajorAdminCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "email": "support1@autotrust.com",
                    "password": "a-temporary-password",
                    "permissions": ["manage_inspections"],
                }
            ]
        }
    )

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    permissions: list[Permission] = Field(default_factory=list)


class PermissionsUpdate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"permissions": ["manage_inspections", "manage_users"]}]}
    )

    permissions: list[Permission]


class PermissionInfo(BaseModel):
    value: Permission
    description: str


class UserLogin(BaseModel):
    """Request body for POST /auth/login."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"email": "buyer@example.com", "password": "supersecret123"}]
        }
    )

    email: EmailStr
    password: str


class Token(BaseModel):
    """Response body for a successful login."""

    access_token: str
    token_type: str = "bearer"
