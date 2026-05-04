from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Ingrediente
from app.modules.catalogo.unit_of_work import CatalogUnitOfWork
from app.modules.ingredientes.schemas import (
    IngredienteCreate,
    IngredienteList,
    IngredientePublic,
    IngredienteUpdate,
)


class IngredienteService:
    """
    Servicio de negocio para Ingrediente.
    Usa CatalogUnitOfWork para transacciones atómicas.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, data: IngredienteCreate) -> IngredientePublic:
        """Crear nuevo ingrediente."""
        with CatalogUnitOfWork(self._session) as uow:
            # Validar que no exista con el mismo nombre
            existing = uow.ingredientes.get_by_nombre(data.nombre)
            if existing is not None:
                raise HTTPException(
                    status_code=409, detail="Ingrediente con ese nombre ya existe"
                )

            ingrediente = Ingrediente(**data.model_dump())
            uow.ingredientes.add(ingrediente)

            # Convertir dentro del contexto
            result = IngredientePublic.model_validate(ingrediente)

        return result

    def get_all(self, offset: int = 0, limit: int = 20) -> IngredienteList:
        """Obtener todos los ingredientes (no eliminados)."""
        with CatalogUnitOfWork(self._session) as uow:
            items = uow.ingredientes.get_active_paginated(offset=offset, limit=limit)
            total = uow.ingredientes.count_active()
            data = [IngredientePublic.model_validate(item) for item in items]
        return IngredienteList(data=data, total=total)

    def get_by_id(self, ingrediente_id: int) -> IngredientePublic:
        """Obtener ingrediente por ID."""
        with CatalogUnitOfWork(self._session) as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)

            if ingrediente is None or ingrediente.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

            # Convertir dentro del contexto
            result = IngredientePublic.model_validate(ingrediente)

        return result

    def update(self, ingrediente_id: int, data: IngredienteUpdate) -> IngredientePublic:
        """Actualizar ingrediente."""
        with CatalogUnitOfWork(self._session) as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)

            if ingrediente is None or ingrediente.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

            # Validar nombre único si cambió
            if data.nombre and data.nombre != ingrediente.nombre:
                existing = uow.ingredientes.get_by_nombre(data.nombre)
                if existing is not None:
                    raise HTTPException(
                        status_code=409, detail="Ingrediente con ese nombre ya existe"
                    )

            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(ingrediente, key, value)

            ingrediente.updated_at = datetime.now(timezone.utc)
            uow.ingredientes.add(ingrediente)

            # Convertir dentro del contexto
            result = IngredientePublic.model_validate(ingrediente)

        return result

    def soft_delete(self, ingrediente_id: int) -> None:
        """Soft delete (marcar como deleted_at)."""
        with CatalogUnitOfWork(self._session) as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)

            if ingrediente is None or ingrediente.deleted_at is not None:
                raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

            now = datetime.now(timezone.utc)
            ingrediente.deleted_at = now
            ingrediente.updated_at = now
            uow.ingredientes.add(ingrediente)
