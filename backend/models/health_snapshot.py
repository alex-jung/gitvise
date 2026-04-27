from datetime import datetime
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class HealthSnapshot(Base):
    """One row per sync run – avg health score + issue counts for the org."""

    __tablename__ = "health_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    avg_score: Mapped[int] = mapped_column(Integer)
    critical: Mapped[int] = mapped_column(Integer, default=0)
    stale: Mapped[int] = mapped_column(Integer, default=0)
    unprotected: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
