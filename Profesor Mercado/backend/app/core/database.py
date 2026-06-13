# app/core/database.py — Conexión a la base de datos y sesiones
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import URL
from app.core.config import settings

# Engine global de SQLAlchemy (pool de conexiones)
engine = create_engine(URL.create(**settings.db_conn_params), echo=False)


def get_session():
    # Generador de sesiones para inyectar como dependencia de FastAPI
    with Session(engine) as session:
        yield session


def create_all_tables():
    # Crea todas las tablas si no existen (migración básica)
    import app.modules.products.models
    import app.modules.orders.models
    import app.modules.payments.models
    SQLModel.metadata.create_all(engine)
