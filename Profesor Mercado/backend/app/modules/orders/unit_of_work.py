# app/modules/orders/unit_of_work.py — Unit of Work específico para pedidos
from sqlmodel import Session
from app.core.unit_of_work import UnitOfWork
from app.modules.orders.repository import PedidoRepository


class PedidoUnitOfWork(UnitOfWork):
    """Unit of Work que expone el repositorio de pedidos para operaciones transaccionales."""

    def __init__(self, session: Session) -> None:
        super().__init__(session)
        self.pedidos = PedidoRepository(session)
