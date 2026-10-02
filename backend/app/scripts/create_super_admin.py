"""One-time setup: create the AutoTrust super admin.

    cd backend
    .venv\\Scripts\\python.exe -m app.scripts.create_super_admin

Prompts for the password (hidden). The email defaults to COMPANY_ACCOUNT_EMAIL,
so the super admin is also the company account whose listings are auto-vetted;
pass --email to use a different address. If an account with that email already
exists it's promoted and its password is reset. Refuses to run when a super
admin already exists — there can only be one.
"""

import argparse
import getpass
import sys

from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import inspection, user, vehicle  # noqa: F401 - registers models on Base.metadata
from app.repositories import user_repository
from app.services import admin_service
from app.services.admin_service import SuperAdminExistsError


def main() -> int:
    parser = argparse.ArgumentParser(description="Create the AutoTrust super admin.")
    parser.add_argument("--email", default=settings.COMPANY_ACCOUNT_EMAIL)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        current = user_repository.get_super_admin(db)
        if current is not None:
            print(f"A super admin already exists ({current.email}). There can only be one.")
            return 1

        if user_repository.get_user_by_email(db, args.email):
            answer = input(
                f"{args.email} already has an account. Promote it to super admin and "
                "reset its password? [y/N] "
            )
            if answer.strip().lower() != "y":
                print("Cancelled.")
                return 1

        password = getpass.getpass("Password (8-72 characters): ")
        if not 8 <= len(password) <= 72:
            print("Password must be 8 to 72 characters.")
            return 1
        if getpass.getpass("Confirm password: ") != password:
            print("Passwords do not match.")
            return 1

        try:
            admin_service.create_super_admin(db, args.email, password)
        except (SuperAdminExistsError, IntegrityError):
            print("A super admin already exists. There can only be one.")
            return 1
        print(f"Super admin created: {args.email}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
