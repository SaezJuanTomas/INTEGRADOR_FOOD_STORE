from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    postgres_user: str = "postgres"
    postgres_password: str = "password"
    postgres_db: str = "food_store_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    SECRET_KEY: str = "change_this_secret_key_for_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_NAME: str = "access_token"
    # MercadoPago (nuevos nombres)
    MP_ACCESS_TOKEN: str = ""
    MP_PUBLIC_KEY: str = ""
    MP_WEBHOOK_URL: str = ""
    NGROK_URL: str = ""

    # MercadoPago (nombres anteriores, compatibilidad)
    MERCADOPAGO_ACCESS_TOKEN: str = ""
    MERCADOPAGO_PUBLIC_KEY: str = ""

    # URLs para frontend y webhooks
    VITE_FRONTEND_URL: str = "http://localhost:5500"
    VITE_API_URL: str = "http://localhost:8000"

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        if self.ENVIRONMENT == "development":
            return "sqlite:///./food_store.db"
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
