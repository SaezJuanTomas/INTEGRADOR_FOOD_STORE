# app/core/config.py — Configuración centralizada vía variables de entorno
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Base de datos PostgreSQL ---
    postgres_user:     str = "postgres"
    postgres_password: str = "postgres"
    postgres_db:       str = "foodstore_simple"
    postgres_host:     str = "localhost"
    postgres_port:     int = 5432

    @property
    def db_driver(self) -> str:
        # Driver SQLAlchemy para PostgreSQL
        return "postgresql+psycopg2"

    @property
    def db_conn_params(self) -> dict:
        # Parámetros de conexión listos para SQLAlchemy
        return {
            "drivername": self.db_driver,
            "username":   self.postgres_user,
            "password":   self.postgres_password,
            "host":       self.postgres_host,
            "port":       self.postgres_port,
            "database":   self.postgres_db,
        }

    # --- MercadoPago ---
    MP_ACCESS_TOKEN:  Optional[str] = None
    MP_PUBLIC_KEY:    Optional[str] = None
    MP_WEBHOOK_URL:   Optional[str] = None
    NGROK_URL:        Optional[str] = None

    # --- CORS y Frontend ---
    CORS_ORIGINS:       str = "http://localhost:5173"
    VITE_FRONTEND_URL:  str = "http://localhost:5173"
    VITE_API_URL:       str = "http://localhost:8000"

    model_config = {
        "env_file":          ".env",
        "env_file_encoding": "utf-8",
        "extra":             "ignore",
    }


# Instancia singleton de configuración
settings = Settings()
