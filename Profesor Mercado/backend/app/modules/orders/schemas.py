# app/modules/orders/schemas.py — Esquemas Pydantic para serialización de pedidos
from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field


class ItemPedidoCreate(SQLModel):
    """Esquema para crear un ítem dentro de un pedido (con snapshot de precio para histórico)."""
    producto_id:     int
    nombre_snapshot: str
    precio_snapshot: float
    cantidad:        int = Field(ge=1)


class PedidoCreate(SQLModel):
    """Esquema de entrada para crear un nuevo pedido con sus ítems."""
    items: List[ItemPedidoCreate]


class PedidoPublic(SQLModel):
    """Esquema de respuesta pública para un pedido."""
    model_config = {"from_attributes": True}

    id:         int
    total:      float
    estado:     str
    created_at: Optional[datetime] = None
