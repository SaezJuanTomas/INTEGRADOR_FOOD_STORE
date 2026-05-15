from typing import List, Optional

from sqlmodel import Field, Relationship

from app.core.base import BaseModel


class EstadoPedido(BaseModel, table=True):
    """
    Estado del pedido (PENDIENTE, CONFIRMADO, PREPARANDO, EN_CAMINO, ENTREGADO, CANCELADO).
    PK: codigo (e.g., PENDIENTE)
    """

    __tablename__ = "estados_pedido"

    codigo: str = Field(primary_key=True, max_length=50, nullable=False)
    nombre: str = Field(max_length=100, nullable=False, unique=True)
    descripcion: Optional[str] = Field(default=None, nullable=True)

    # Relaciones
    pedidos: List["Pedido"] = Relationship(back_populates="estado")
    historiales: List["HistorialEstadoPedido"] = Relationship(back_populates="estado_desde", cascade_delete=True)
    historiales_hacia: List["HistorialEstadoPedido"] = Relationship(back_populates="estado_hacia", cascade_delete=True)

    def __repr__(self) -> str:
        return f"EstadoPedido(codigo={self.codigo}, nombre={self.nombre})"
