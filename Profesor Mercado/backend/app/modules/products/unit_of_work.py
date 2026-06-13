# app/modules/products/unit_of_work.py — Unit of Work específico para productos
from sqlmodel import Session
from app.core.unit_of_work import UnitOfWork
from app.modules.products.repository import ProductoRepository


class ProductoUnitOfWork(UnitOfWork):
    """Unit of Work que expone el repositorio de productos para operaciones transaccionales."""

    def __init__(self, session: Session) -> None:
        super().__init__(session)
        self.productos = ProductoRepository(session)
