import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.engine import Engine
from core.config import settings


class Base(DeclarativeBase):
    pass


_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def init_db() -> Engine:
    global _engine, _SessionLocal

    os.makedirs(settings.data_dir, exist_ok=True)

    _engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(_engine, "connect")
    def set_pragmas(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    from models.settings import AppConfig  # noqa: F401 – registers the model
    from models.repo import Repository  # noqa: F401 – registers the model

    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def SessionLocal() -> Session:
    """Return a new DB session (for use outside of FastAPI dependency injection)."""
    if _SessionLocal is None:
        raise RuntimeError("Database not initialised – call init_db() first")
    return _SessionLocal()


def get_db():
    if _SessionLocal is None:
        raise RuntimeError("Database not initialised – call init_db() first")
    db: Session = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
