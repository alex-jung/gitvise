from datetime import datetime
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class DependabotAlert(Base):
    __tablename__ = "dependabot_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    repo_full_name: Mapped[str] = mapped_column(String, index=True)
    alert_number: Mapped[int] = mapped_column(Integer)
    package_name: Mapped[str] = mapped_column(String)
    ecosystem: Mapped[str | None] = mapped_column(String, nullable=True)
    # low | medium | high | critical
    severity: Mapped[str] = mapped_column(String)
    # open | dismissed | fixed
    state: Mapped[str] = mapped_column(String, default="open")
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    cve_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fixed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
