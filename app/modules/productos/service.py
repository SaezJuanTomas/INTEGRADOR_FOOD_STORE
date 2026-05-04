from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Producto
from app.modules.catalogo.unit_of_work import CatalogUnitOfWork
from app.modules.productos.schemas import (
    ProductoCreate,
    ProductoList,
    ProductoPublic,
    ProductoUpdate,
)


class ProductoService:
    """
    Servicio de negocio para Producto.
    Usa CatalogUnitOfWork para transacciones atómicas.
    Maneja relaciones N:M con Categoria e Ingrediente.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def _to_public(self, producto: Producto) -> ProductoPublic:
        """Convertir modelo a DTO Public (incluye ingrediente_ids)."""
        categoria_id = None
        for item in producto.productos_categorias:
            if item.es_principal:
                categoria_id = item.categoria_id
                break

        if categoria_id is None and producto.productos_categorias:
            categoria_id = producto.productos_categorias[0].categoria_id

        ingrediente_ids = [
            item.ingrediente_id for item in producto.productos_ingredientes
        ]
        return ProductoPublic(
            id=producto.id,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            precio_base=producto.precio_base,
            imagenes_url=producto.imagenes_url,
            tiempo_prep_min=producto.tiempo_prep_min,
            disponible=producto.disponible,
            categoria_id=categoria_id,
            ingrediente_ids=ingrediente_ids,
        )

    def create(self, data: ProductoCreate) -> ProductoPublic:
        """Crear nuevo producto con ingredientes."""
        with CatalogUnitOfWork(self._session) as uow:
            # Validar nombre único
            existing = uow.productos.get_by_nombre(data.nombre)
            if existing is not None:
                raise HTTPException(
                    status_code=409, detail="Producto con ese nombre ya existe"
                )

            payload = data.model_dump(exclude={"ingrediente_ids", "categoria_id"})
            producto = Producto(**payload)

            if data.categoria_id is not None:
                categoria = uow.categorias.get_by_id(data.categoria_id)
                if categoria is None or categoria.deleted_at is not None:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Categoria con ID {data.categoria_id} no existe",
                    )

            # Validar que todos los ingredientes existan
            if data.ingrediente_ids:
                for ing_id in data.ingrediente_ids:
                    ingrediente = uow.ingredientes.get_by_id(ing_id)
                    if ingrediente is None:
                        raise HTTPException(
                            status_code=422,
                            detail=f"Ingrediente con ID {ing_id} no existe",
                        )

            uow.productos.add(producto)

            if data.categoria_id is not None:
                uow.productos.set_categoria_principal(producto.id, data.categoria_id)

            uow.productos.set_ingredientes(producto.id, data.ingrediente_ids)

            uow._session.flush()
            uow._session.refresh(producto)

            # Convertir dentro del contexto
            result = self._to_public(producto)

        return result

    def get_all(self, offset: int = 0, limit: int = 20) -> ProductoList:
        """Obtener todos los productos (no eliminados)."""
        with CatalogUnitOfWork(self._session) as uow:
            items = uow.productos.get_active_paginated(offset=offset, limit=limit)
            total = uow.productos.count_active()
            # Convertir dentro del contexto para evitar lazy-load con sesión cerrada.
            data = [self._to_public(item) for item in items]
        return ProductoList(data=data, total=total)

    def get_by_id(self, producto_id: int) -> ProductoPublic:
        """Obtener producto por ID."""
        with CatalogUnitOfWork(self._session) as uow:
            producto = uow.productos.get_by_id(producto_id)

            if producto is None or producto.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            # Convertir dentro del contexto
            result = self._to_public(producto)

        return result

    def update(self, producto_id: int, data: ProductoUpdate) -> ProductoPublic:
        """Actualizar producto."""
        with CatalogUnitOfWork(self._session) as uow:
            producto = uow.productos.get_by_id(producto_id)

            if producto is None or producto.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            # Validar nombre único si cambió
            if data.nombre and data.nombre != producto.nombre:
                existing = uow.productos.get_by_nombre(data.nombre)
                if existing is not None:
                    raise HTTPException(
                        status_code=409, detail="Producto con ese nombre ya existe"
                    )

            update_data = data.model_dump(
                exclude_unset=True,
                exclude={"ingrediente_ids", "categoria_id"},
            )
            for key, value in update_data.items():
                setattr(producto, key, value)

            if data.categoria_id is not None:
                categoria = uow.categorias.get_by_id(data.categoria_id)
                if categoria is None or categoria.deleted_at is not None:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Categoria con ID {data.categoria_id} no existe",
                    )

                uow.productos.set_categoria_principal(producto.id, data.categoria_id)

            # Actualizar ingredientes si se proporciona
            if data.ingrediente_ids is not None:
                for ing_id in data.ingrediente_ids:
                    ingrediente = uow.ingredientes.get_by_id(ing_id)
                    if ingrediente is None:
                        raise HTTPException(
                            status_code=422,
                            detail=f"Ingrediente con ID {ing_id} no existe",
                        )

                uow.productos.set_ingredientes(producto.id, data.ingrediente_ids)

            producto.updated_at = datetime.now(timezone.utc)
            uow.productos.add(producto)
            uow._session.flush()
            uow._session.refresh(producto)

            # Convertir dentro del contexto
            result = self._to_public(producto)

        return result

    def soft_delete(self, producto_id: int) -> None:
        """Soft delete (marcar como deleted_at)."""
        with CatalogUnitOfWork(self._session) as uow:
            producto = uow.productos.get_by_id(producto_id)

            if producto is None or producto.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            now = datetime.now(timezone.utc)
            producto.deleted_at = now
            producto.updated_at = now
            uow.productos.add(producto)
