# app/modules/products/repository.py — Repositorio específico de productos
from sqlmodel import Session, select

from app.core.base_repository import BaseRepository
from app.modules.products.models import Producto


class ProductoRepository(BaseRepository[Producto]):
    """Repositorio de productos. Agrega métodos de consulta específicos del dominio."""

    def __init__(self, session: Session):
        super().__init__(Producto, session)

    def get_activos(self) -> list[Producto]:
        # Retorna solo los productos marcados como activos
        return list(
            self.session.exec(
                select(Producto).where(Producto.activo == True)
            ).all()
        )
