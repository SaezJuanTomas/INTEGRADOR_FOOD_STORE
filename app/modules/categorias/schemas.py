from typing import List, Optional

from sqlmodel import Field, SQLModel


class CategoriaCreate(SQLModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = None
    orden_display: int = Field(default=0, ge=0)


class CategoriaUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = None
    orden_display: Optional[int] = Field(default=None, ge=0)


class CategoriaPublic(SQLModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    orden_display: int


class CategoriaList(SQLModel):
    data: List[CategoriaPublic]
    total: int
