# app/modules/products/schemas.py — Esquemas Pydantic para serialización de productos
from typing import Optional
from sqlmodel import SQLModel


class ProductoPublic(SQLModel):
    """Esquema de respuesta pública para un producto (sin campos internos como activo o created_at)."""
    id:          int
    nombre:      str
    descripcion: Optional[str] = None
    precio:      float
    imagen_url:  Optional[str] = None
