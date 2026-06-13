# app/modules/orders/repository.py — Repositorio específico de pedidos
from sqlmodel import Session
from app.core.base_repository import BaseRepository
from app.modules.orders.models import Pedido


class PedidoRepository(BaseRepository[Pedido]):
    """Repositorio de pedidos. Hereda CRUD básico de BaseRepository."""

    def __init__(self, session: Session):
        super().__init__(Pedido, session)
