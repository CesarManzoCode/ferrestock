from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FerreStock"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Trial
    TRIAL_DAYS: int = 14

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",   # ignorar vars de Docker como POSTGRES_USER
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
