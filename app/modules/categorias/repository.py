from sqlmodel import Session, func, select

from app.core.repository import BaseRepository
from app.models import Categoria


class CategoriaRepository(BaseRepository[Categoria]):
    """
    Repository específico para Categoria.
    Hereda CRUD genérico de BaseRepository[Categoria].
    Puede tener queries personalizadas si es necesario.
    """

    def __init__(self, session: Session):
        super().__init__(session, Categoria)

    def get_by_nombre(self, nombre: str) -> Categoria | None:
        """Buscar categoría por nombre exacto."""
        statement = select(Categoria).where(Categoria.nombre == nombre)
        return self.session.exec(statement).first()

    def get_active_paginated(self, offset: int = 0, limit: int = 20) -> list[Categoria]:
        """Obtener categorías no eliminadas con paginación."""
        statement = (
            select(Categoria)
            .where(Categoria.deleted_at.is_(None))
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def count_active(self) -> int:
        """Contar categorías no eliminadas."""
        statement = select(func.count()).select_from(Categoria).where(
            Categoria.deleted_at.is_(None)
        )
        return self.session.exec(statement).one()

    def get_root_categories(self) -> list[Categoria]:
        """Obtener todas las categorías raíz (sin parent)."""
        statement = select(Categoria).where(Categoria.parent_id.is_(None))
        return self.session.exec(statement).all()
