from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class AppConfig(Base):
    """Key-value store for all application configuration."""
    __tablename__ = "app_config"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False)
    encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
