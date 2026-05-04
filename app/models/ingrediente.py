from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

from app.core.base import BaseModel

if TYPE_CHECKING:
    from app.models.producto import Producto
    from app.models.ingrediente import Ingrediente


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class ProductoIngrediente(SQLModel, table=True):
    """
    Tabla intermedia N:M entre Producto e Ingrediente.
    PK compuesta, es_removible y es_opcional flags.
    Relationships bidireccionales.
    """

    __tablename__ = "productos_ingredientes"

    producto_id: int = Field(foreign_key="productos.id", primary_key=True, nullable=False)
    ingrediente_id: int = Field(foreign_key="ingredientes.id", primary_key=True, nullable=False)
    es_removible: bool = Field(default=False, nullable=False)
    es_opcional: bool = Field(default=False, nullable=False)

    producto: "Producto" = Relationship(back_populates="productos_ingredientes")
    ingrediente: "Ingrediente" = Relationship(back_populates="productos_ingredientes")


class Ingrediente(BaseModel, table=True):
    """
    Ingrediente global. Se asigna a Productos via ProductoIngrediente N:M.
    es_alergeno es un flag crítico para UX.
    """

    __tablename__ = "ingredientes"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True, index=True, nullable=False)
    descripcion: Optional[str] = Field(default=None, nullable=True)
    es_alergeno: bool = Field(default=False, nullable=False)

    # N:M hacia Productos
    productos_ingredientes: list["ProductoIngrediente"] = Relationship(
        back_populates="ingrediente"
    )
