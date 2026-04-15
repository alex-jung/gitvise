from datetime import datetime
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    repo_full_name: Mapped[str] = mapped_column(String, index=True)
    run_id: Mapped[int] = mapped_column(Integer, index=True)
    workflow_name: Mapped[str] = mapped_column(String)
    workflow_id: Mapped[int] = mapped_column(Integer)
    branch: Mapped[str | None] = mapped_column(String, nullable=True)
    # status: queued | in_progress | completed
    status: Mapped[str] = mapped_column(String)
    # conclusion: success | failure | cancelled | skipped | timed_out | None
    conclusion: Mapped[str | None] = mapped_column(String, nullable=True)
    # event: push | pull_request | schedule | workflow_dispatch | ...
    event: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    run_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Duration in seconds (computed from run_started_at → updated_at for completed runs)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
