from decimal import Decimal

from sqlmodel import Session, func, select

from app.core.repository import BaseRepository
from app.models import Producto, ProductoCategoria, ProductoIngrediente


class ProductoRepository(BaseRepository[Producto]):
    """
    Repository específico para Producto.
    Hereda CRUD genérico de BaseRepository[Producto].
    Incluye queries personalizadas para filtrados comunes.
    """

    def __init__(self, session: Session):
        super().__init__(session, Producto)

    def get_by_nombre(self, nombre: str) -> Producto | None:
        """Buscar producto por nombre exacto."""
        statement = select(Producto).where(Producto.nombre == nombre)
        return self.session.exec(statement).first()

    def get_active_paginated(self, offset: int = 0, limit: int = 20) -> list[Producto]:
        """Obtener productos no eliminados con paginación."""
        statement = (
            select(Producto)
            .where(Producto.deleted_at.is_(None))
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def count_active(self) -> int:
        """Contar productos no eliminados."""
        statement = select(func.count()).select_from(Producto).where(
            Producto.deleted_at.is_(None)
        )
        return self.session.exec(statement).one()

    def set_categoria_principal(self, producto_id: int, categoria_id: int) -> None:
        """Reemplazar la categoría principal del producto."""
        self.session.query(ProductoCategoria).filter(
            ProductoCategoria.producto_id == producto_id
        ).delete()
        self.session.add(
            ProductoCategoria(
                producto_id=producto_id,
                categoria_id=categoria_id,
                es_principal=True,
            )
        )

    def set_ingredientes(self, producto_id: int, ingrediente_ids: list[int]) -> None:
        """Reemplazar ingredientes asociados del producto."""
        self.session.query(ProductoIngrediente).filter(
            ProductoIngrediente.producto_id == producto_id
        ).delete()

        for ingrediente_id in ingrediente_ids:
            self.session.add(
                ProductoIngrediente(
                    producto_id=producto_id,
                    ingrediente_id=ingrediente_id,
                    es_removible=True,
                    es_opcional=False,
                )
            )

    def get_disponibles(self, offset: int = 0, limit: int = 100) -> list[Producto]:
        """Obtener todos los productos disponibles."""
        statement = (
            select(Producto)
            .where(Producto.disponible == True)
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_precio_range(
        self, min_precio: Decimal, max_precio: Decimal
    ) -> list[Producto]:
        """Obtener productos dentro de un rango de precio."""
        statement = select(Producto).where(
            Producto.precio_base >= min_precio, Producto.precio_base <= max_precio
        )
        return self.session.exec(statement).all()
