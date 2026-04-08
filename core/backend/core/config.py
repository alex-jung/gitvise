import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    data_dir: str = os.getenv("DATA_DIR", "/data")
    port: int = int(os.getenv("PORT", "3001"))
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.data_dir}/gitvise.db"

    @property
    def encryption_key_path(self) -> str:
        return f"{self.data_dir}/encryption.key"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
