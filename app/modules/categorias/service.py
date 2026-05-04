from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Categoria
from app.modules.catalogo.unit_of_work import CatalogUnitOfWork
from app.modules.categorias.schemas import (
    CategoriaCreate,
    CategoriaList,
    CategoriaPublic,
    CategoriaUpdate,
)


class CategoriaService:
    """
    Servicio de negocio para Categoría.
    Usa CatalogUnitOfWork para transacciones atómicas.
    Patrón: __init__(session) → cada método abre UoW.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, data: CategoriaCreate) -> CategoriaPublic:
        """Crear nueva categoría."""
        with CatalogUnitOfWork(self._session) as uow:
            # Validar que no exista con el mismo nombre
            existing = uow.categorias.get_by_nombre(data.nombre)
            if existing is not None:
                raise HTTPException(
                    status_code=409, detail="Categoría con ese nombre ya existe"
                )

            categoria = Categoria(**data.model_dump())
            uow.categorias.add(categoria)
            
            # Convertir a DTO dentro del contexto con la sesión activa
            result = CategoriaPublic.model_validate(categoria)

        return result

    def get_all(self, offset: int = 0, limit: int = 20) -> CategoriaList:
        """Obtener todas las categorías (no eliminadas)."""
        with CatalogUnitOfWork(self._session) as uow:
            items = uow.categorias.get_active_paginated(offset=offset, limit=limit)
            total = uow.categorias.count_active()
            data = [CategoriaPublic.model_validate(item) for item in items]
        return CategoriaList(data=data, total=total)

    def get_by_id(self, categoria_id: int) -> CategoriaPublic:
        """Obtener categoría por ID."""
        with CatalogUnitOfWork(self._session) as uow:
            categoria = uow.categorias.get_by_id(categoria_id)

            if categoria is None or categoria.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Categoría no encontrada")

            # Convertir dentro del contexto
            result = CategoriaPublic.model_validate(categoria)

        return result

    def update(self, categoria_id: int, data: CategoriaUpdate) -> CategoriaPublic:
        """Actualizar categoría."""
        with CatalogUnitOfWork(self._session) as uow:
            categoria = uow.categorias.get_by_id(categoria_id)

            if categoria is None or categoria.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Categoría no encontrada")

            # Validar nombre único si cambió
            if data.nombre and data.nombre != categoria.nombre:
                existing = uow.categorias.get_by_nombre(data.nombre)
                if existing is not None:
                    raise HTTPException(
                        status_code=409, detail="Categoría con ese nombre ya existe"
                    )

            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(categoria, key, value)

            categoria.updated_at = datetime.now(timezone.utc)
            uow.categorias.add(categoria)

            # Convertir dentro del contexto
            result = CategoriaPublic.model_validate(categoria)

        return result

    def soft_delete(self, categoria_id: int) -> None:
        """Soft delete (marcar como deleted_at)."""
        with CatalogUnitOfWork(self._session) as uow:
            categoria = uow.categorias.get_by_id(categoria_id)

            if categoria is None or categoria.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Categoría no encontrada")

            now = datetime.now(timezone.utc)
            categoria.deleted_at = now
            categoria.updated_at = now
            uow.categorias.add(categoria)
