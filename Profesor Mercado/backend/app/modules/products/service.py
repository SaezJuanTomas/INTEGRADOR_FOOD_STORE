# app/modules/products/service.py — Lógica de negocio para productos
from fastapi import HTTPException, status
from sqlmodel import Session

from app.modules.products.schemas import ProductoPublic
from app.modules.products.unit_of_work import ProductoUnitOfWork


class ProductoService:
    """Capa de servicio con la lógica de negocio del módulo de productos."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[ProductoPublic]:
        # Lista todos los productos activos del catálogo
        with ProductoUnitOfWork(self._session) as uow:
            productos = uow.productos.get_activos()
            return [ProductoPublic.model_validate(p) for p in productos]

    def get_by_id(self, producto_id: int) -> ProductoPublic:
        # Busca un producto por ID y valida que exista y esté activo
        with ProductoUnitOfWork(self._session) as uow:
            producto = uow.productos.get_by_id(producto_id)
            if not producto or not producto.activo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado",
                )
            return ProductoPublic.model_validate(producto)
