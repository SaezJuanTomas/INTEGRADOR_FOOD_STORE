# app/core/base_repository.py — Repositorio genérico con operaciones CRUD
from typing import TypeVar, Generic, Type
from sqlmodel import SQLModel, Session, select

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    """Repositorio base genérico. Implementa CRUD básico para cualquier modelo SQLModel."""

    def __init__(self, model: Type[T], session: Session):
        self.model = model
        self.session = session

    def get_by_id(self, entity_id: int) -> T | None:
        # Busca una entidad por su ID primario
        return self.session.get(self.model, entity_id)

    def get_all(self) -> list[T]:
        # Retorna todas las entidades del modelo
        return list(self.session.exec(select(self.model)).all())

    def add(self, entity: T) -> T:
        # Agrega una nueva entidad y la refresca con los datos generados (ej: ID)
        self.session.add(entity)
        self.session.flush()
        self.session.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        # Actualiza una entidad existente
        self.session.add(entity)
        self.session.flush()
        self.session.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        # Elimina una entidad de la base de datos
        self.session.delete(entity)
        self.session.flush()
