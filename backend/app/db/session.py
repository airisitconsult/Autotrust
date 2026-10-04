from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False is SQLite-specific: it allows the connection to be
    # used across the different threads FastAPI's request handling can use.
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Postgres (Neon). Neon pauses idle databases and closes their connections,
    # so test each pooled connection before using it (pool_pre_ping) and don't
    # keep any for longer than five minutes (pool_recycle).
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

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
