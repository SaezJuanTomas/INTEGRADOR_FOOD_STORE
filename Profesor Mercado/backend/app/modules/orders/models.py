# app/modules/orders/models.py — Modelo de datos para pedidos
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Pedido(SQLModel, table=True):
    """Modelo que representa un pedido realizado por un cliente."""
    __tablename__ = "pedidos"

    id:         Optional[int] = Field(default=None, primary_key=True)
    total:      float         = Field(ge=0)
    estado:     str           = Field(default="pendiente", max_length=20)
    created_at: datetime      = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
