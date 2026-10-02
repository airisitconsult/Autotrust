from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Every SQLAlchemy model inherits from this so they share one metadata registry."""
