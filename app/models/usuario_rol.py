from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.rol import Rol


class UsuarioRol(SQLModel, table=True):
    """
    Tabla intermedia N:N entre Usuario y Rol.
    PK compuesta: usuario_id + rol_codigo
    """

    __tablename__ = "usuarios_roles"

    usuario_id: int = Field(foreign_key="usuarios.id", primary_key=True, nullable=False)
    rol_codigo: str = Field(foreign_key="roles.codigo", primary_key=True, max_length=50, nullable=False)

    usuario: "Usuario" = Relationship(back_populates="usuarios_roles")
    rol: "Rol" = Relationship(back_populates="usuarios_roles")
