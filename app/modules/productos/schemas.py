from decimal import Decimal
from typing import List, Optional

from sqlmodel import Field, SQLModel


class ProductoCreate(SQLModel):
    nombre: str = Field(min_length=2, max_length=150)
    descripcion: Optional[str] = None
    precio_base: Decimal = Field(default=0, ge=0, max_digits=10, decimal_places=2)
    imagenes_url: Optional[str] = None
    tiempo_prep_min: Optional[int] = Field(default=None, ge=0)
    disponible: bool = True
    categoria_id: Optional[int] = None
    ingrediente_ids: List[int] = Field(default_factory=list)


class ProductoUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    imagenes_url: Optional[str] = None
    tiempo_prep_min: Optional[int] = Field(default=None, ge=0)
    disponible: Optional[bool] = None
    categoria_id: Optional[int] = None
    ingrediente_ids: Optional[List[int]] = None


class ProductoPublic(SQLModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    precio_base: Decimal
    imagenes_url: Optional[str] = None
    tiempo_prep_min: Optional[int] = None
    disponible: bool
    categoria_id: Optional[int] = None
    ingrediente_ids: List[int] = Field(default_factory=list)


class ProductoList(SQLModel):
    data: List[ProductoPublic]
    total: int
