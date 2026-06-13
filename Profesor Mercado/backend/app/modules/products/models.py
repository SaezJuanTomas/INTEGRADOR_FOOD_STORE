# app/modules/products/models.py — Modelo de datos para productos
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Producto(SQLModel, table=True):
    """Modelo que representa un producto del catálogo."""
    __tablename__ = "productos"

    id:          Optional[int] = Field(default=None, primary_key=True)
    nombre:      str           = Field(max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    precio:      float         = Field(ge=0)
    imagen_url:  Optional[str] = Field(default=None, max_length=500)
    activo:      bool          = Field(default=True)
    created_at:  datetime      = Field(default_factory=datetime.utcnow)
