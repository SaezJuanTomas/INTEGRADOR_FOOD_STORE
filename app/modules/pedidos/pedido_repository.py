from sqlmodel import Session, func, select

from app.core.repository import BaseRepository
from app.models import Pedido


class PedidoRepository(BaseRepository[Pedido]):
    """
    Repositorio específico para Pedido.
    Hereda CRUD genérico de BaseRepository[Pedido].
    Incluye queries personalizadas para filtrados comunes.
    """

    def __init__(self, session: Session):
        super().__init__(session, Pedido)

    def get_by_usuario_id(self, usuario_id: int, offset: int = 0, limit: int = 20) -> list[Pedido]:
        """Obtener pedidos de un usuario."""
        statement = (
            select(Pedido)
            .where(Pedido.usuario_id == usuario_id, Pedido.deleted_at.is_(None))
            .order_by(Pedido.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_estado(self, estado_codigo: str, offset: int = 0, limit: int = 20) -> list[Pedido]:
        """Obtener pedidos por estado."""
        statement = (
            select(Pedido)
            .where(Pedido.estado_codigo == estado_codigo, Pedido.deleted_at.is_(None))
            .order_by(Pedido.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def count_by_usuario(self, usuario_id: int) -> int:
        """Contar pedidos de un usuario."""
        statement = select(func.count()).select_from(Pedido).where(
            Pedido.usuario_id == usuario_id,
            Pedido.deleted_at.is_(None),
        )
        return self.session.exec(statement).one()

    def get_all(self, offset: int = 0, limit: int = 20) -> list[Pedido]:
        """Obtener todos los pedidos (uso administrativo)."""
        statement = (
            select(Pedido)
            .where(Pedido.deleted_at.is_(None))
            .order_by(Pedido.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def count_all(self) -> int:
        """Contar todos los pedidos no eliminados (uso administrativo)."""
        statement = select(func.count()).select_from(Pedido).where(
            Pedido.deleted_at.is_(None),
        )
        return self.session.exec(statement).one()

    def get_by_id_no_deleted(self, pedido_id: int, usuario_id: int | None = None) -> Pedido | None:
        statement = (
            select(Pedido)
            .where(
                Pedido.id == pedido_id,
                Pedido.deleted_at.is_(None),
            )
        )
        if usuario_id is not None:
            statement = statement.where(Pedido.usuario_id == usuario_id)
        return self.session.exec(statement).first()
