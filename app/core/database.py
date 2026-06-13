from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine

from app.core.config import settings

_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=_connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_legacy_schema()


def _migrate_legacy_schema() -> None:
    """Aplicar ajustes mínimos sobre tablas existentes sin migraciones formales."""
    with engine.begin() as connection:
        inspector = inspect(connection)

        if "categorias" in inspector.get_table_names():
            categoria_columns = {column["name"] for column in inspector.get_columns("categorias")}
            if "activo" not in categoria_columns:
                connection.execute(text("ALTER TABLE categorias ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE"))
            if "parent_id" not in categoria_columns:
                connection.execute(text("ALTER TABLE categorias ADD COLUMN parent_id INTEGER"))
            connection.execute(text("UPDATE categorias SET activo = CASE WHEN deleted_at IS NULL THEN TRUE ELSE FALSE END WHERE activo IS NULL"))

        if "productos_ingredientes" in inspector.get_table_names():
            producto_ingrediente_columns = {
                column["name"] for column in inspector.get_columns("productos_ingredientes")
            }
            if "cantidad" not in producto_ingrediente_columns:
                connection.execute(text("ALTER TABLE productos_ingredientes ADD COLUMN cantidad DOUBLE PRECISION NOT NULL DEFAULT 1"))
            if "unidad" not in producto_ingrediente_columns:
                connection.execute(text("ALTER TABLE productos_ingredientes ADD COLUMN unidad VARCHAR(20) NOT NULL DEFAULT 'gramos'"))
            if "es_removible" not in producto_ingrediente_columns:
                connection.execute(text("ALTER TABLE productos_ingredientes ADD COLUMN es_removible BOOLEAN NOT NULL DEFAULT false"))
            if "es_opcional" not in producto_ingrediente_columns:
                connection.execute(text("ALTER TABLE productos_ingredientes ADD COLUMN es_opcional BOOLEAN NOT NULL DEFAULT false"))

        if "ingredientes" in inspector.get_table_names():
            ingrediente_columns = {column["name"] for column in inspector.get_columns("ingredientes")}
            if "stock_actual" not in ingrediente_columns:
                connection.execute(text("ALTER TABLE ingredientes ADD COLUMN stock_actual DOUBLE PRECISION NOT NULL DEFAULT 0"))
            if "stock_minimo" not in ingrediente_columns:
                connection.execute(text("ALTER TABLE ingredientes ADD COLUMN stock_minimo DOUBLE PRECISION NOT NULL DEFAULT 0"))
            if "costo_unitario" not in ingrediente_columns:
                connection.execute(text("ALTER TABLE ingredientes ADD COLUMN costo_unitario NUMERIC(10,4) NOT NULL DEFAULT 0"))
            if "unidad_medida" not in ingrediente_columns:
                connection.execute(text("ALTER TABLE ingredientes ADD COLUMN unidad_medida VARCHAR(20) NOT NULL DEFAULT 'gramos'"))
            if "activo" not in ingrediente_columns:
                connection.execute(text("ALTER TABLE ingredientes ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE"))
            connection.execute(text("UPDATE ingredientes SET activo = CASE WHEN deleted_at IS NULL THEN TRUE ELSE FALSE END WHERE activo IS NULL"))

        if "productos" in inspector.get_table_names():
            producto_columns = {column["name"] for column in inspector.get_columns("productos")}
            if "usa_stock_manual" not in producto_columns:
                connection.execute(text("ALTER TABLE productos ADD COLUMN usa_stock_manual BOOLEAN NOT NULL DEFAULT FALSE"))
            if "stock_manual" not in producto_columns:
                connection.execute(text("ALTER TABLE productos ADD COLUMN stock_manual INTEGER"))
            if "costo_compra_manual" not in producto_columns:
                connection.execute(text("ALTER TABLE productos ADD COLUMN costo_compra_manual NUMERIC(10,4)"))
            if "activo" not in producto_columns:
                connection.execute(text("ALTER TABLE productos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE"))
            connection.execute(text("UPDATE productos SET activo = CASE WHEN deleted_at IS NULL THEN TRUE ELSE FALSE END WHERE activo IS NULL"))

        if "pedidos" in inspector.get_table_names():
            pedido_columns = {column["name"] for column in inspector.get_columns("pedidos")}
            if "forma_pago_codigo" not in pedido_columns:
                connection.execute(text("ALTER TABLE pedidos ADD COLUMN forma_pago_codigo VARCHAR(50)"))


def get_session():
    with Session(engine) as session:
        yield session
