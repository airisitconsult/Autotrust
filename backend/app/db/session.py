from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# check_same_thread=False is SQLite-specific: it allows the connection to be
# used across the different threads FastAPI's request handling can use.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: hands a request a DB session and always closes it after.

    Any route that declares `db: Session = Depends(get_db)` gets a fresh
    session for that request only — FastAPI calls this generator for us.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
