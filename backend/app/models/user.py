import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Enum as SAEnum, Index, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(str, enum.Enum):
    BUYER = "buyer"
    SELLER = "seller"
    INSPECTOR = "inspector"
    # "Major admin" in the product's language: company support staff. There can
    # be many; each has an explicit permission list (User.permissions) granted
    # by the super admin and nothing beyond it.
    ADMIN = "admin"
    # Exactly one, ever. Enforced by the partial unique index on User below,
    # and no API endpoint can assign this role — see app/scripts.
    SUPER_ADMIN = "super_admin"


class Permission(str, enum.Enum):
    """What a major admin may do. The super admin implicitly holds all of
    these. Add a value here when a new admin-facing feature ships."""

    MANAGE_INSPECTIONS = "manage_inspections"  # view the queue, complete/view any inspection
    MANAGE_USERS = "manage_users"  # list users, set buyer/seller/inspector roles


PERMISSION_DESCRIPTIONS: dict[Permission, str] = {
    Permission.MANAGE_INSPECTIONS: "View the inspection queue and complete or view any inspection",
    Permission.MANAGE_USERS: "View all users and assign the buyer, seller or inspector role",
}


class User(Base):
    """The users table. This is the DB shape — see app/schemas/user.py for the
    separate HTTP request/response shapes (they're intentionally not the same).
    """

    __tablename__ = "users"
    __table_args__ = (
        # A unique index over `role`, but only for rows where role is
        # SUPER_ADMIN: so at most one such row can exist, whatever the code
        # does. (Role names, not values, are what SAEnum stores.)
        Index(
            "uq_users_single_super_admin",
            "role",
            unique=True,
            sqlite_where=text("role = 'SUPER_ADMIN'"),
            postgresql_where=text("role = 'SUPER_ADMIN'"),
        ),
    )

    # UUID primary key instead of an auto-increment int: ids aren't
    # sequential/guessable, and it matches a future Firestore-style
    # document-id world better than an incrementing integer would.
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    # Everyone who registers is a BUYER — registration never grants a
    # privileged role. INSPECTOR is assigned by someone with MANAGE_USERS;
    # ADMIN accounts are created by the super admin; the SUPER_ADMIN is made
    # once with `python -m app.scripts.create_super_admin`.
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.BUYER)
    # Permission enum *values*, only meaningful for ADMIN accounts. A plain
    # JSON list, same pattern as Vehicle.features.
    permissions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
