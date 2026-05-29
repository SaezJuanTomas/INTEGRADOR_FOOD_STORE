"""
UsuarioService: Lógica de negocio para usuarios.
"""

from typing import Optional
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session

from app.modules.usuarios.repository import UsuarioRepository
from app.modules.usuarios.direccion_entrega_repository import DireccionEntregaRepository

from app.models import Usuario, UsuarioRol, DireccionEntrega
from app.modules.usuarios.unit_of_work import UsuarioUnitOfWork
from app.modules.usuarios.schemas import (
    UsuarioPublic,
    UsuarioUpdate,
    UsuarioDetail,
    UsuarioList,
    DireccionEntregaCreate,
    DireccionEntregaUpdate,
    DireccionEntregaPublic,
    DireccionEntregaList,
    RolPublic,
)


class UsuarioService:
    """
    Servicio de negocio para Usuario.
    Maneja operaciones CRUD y relaciones con roles/direcciones.
    """

    def __init__(self, session: Session):
        self._session = session

    # ========================================================================
    # USUARIO CRUD
    # ========================================================================

    def get_usuario(self, usuario_id: int) -> UsuarioDetail:
        """
        Obtener usuario con detalles.
        
        Args:
            usuario_id: ID del usuario
            
        Returns:
            Usuario con roles y direcciones
            
        Raises:
            HTTPException: Si usuario no existe o está inactivo
        """
        repo = UsuarioRepository(self._session)
        usuario = repo.get_by_id(usuario_id)
        if not usuario or not usuario.activo or usuario.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        
        return self._to_detail(usuario)

    def list_usuarios(
        self,
        offset: int = 0,
        limit: int = 20,
        include_inactive: bool = False,
    ) -> UsuarioList:
        """
        Listar usuarios con opción de incluir inactivos.
        
        Args:
            offset: Offset de paginación
            limit: Límite de resultados
            include_inactive: Si True, incluye usuarios inactivos
            
        Returns:
            Lista paginada de usuarios
        """
        repo = UsuarioRepository(self._session)
        usuarios = repo.get_paginated(
            offset=offset,
            limit=limit,
            include_inactive=include_inactive,
        )
        total = repo.count(include_inactive=include_inactive)
        
        return UsuarioList(
            data=[self._to_public(u) for u in usuarios],
            total=total,
        )

    def update_usuario(self, usuario_id: int, data: UsuarioUpdate) -> UsuarioDetail:
        """
        Actualizar usuario.
        
        Args:
            usuario_id: ID del usuario
            data: Datos a actualizar
            
        Returns:
            Usuario actualizado
            
        Raises:
            HTTPException: Si usuario no existe
        """
        with UsuarioUnitOfWork(self._session) as uow:
            usuario = uow.usuarios.get_by_id(usuario_id)
            if not usuario or usuario.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            if data.nombre is not None:
                usuario.nombre = data.nombre
            if data.apellido is not None:
                usuario.apellido = data.apellido
            if data.celular is not None:
                usuario.celular = data.celular
            if data.activo is not None:
                usuario.activo = data.activo
                if data.activo:
                    usuario.deleted_at = None

            uow.usuarios.add(usuario)

        return self._to_detail(usuario)

    def delete_usuario(self, usuario_id: int) -> None:
        """
        Soft-delete de usuario.
        
        Args:
            usuario_id: ID del usuario
            
        Raises:
            HTTPException: Si usuario no existe
        """
        with UsuarioUnitOfWork(self._session) as uow:
            usuario = uow.usuarios.get_by_id(usuario_id)
            if not usuario or usuario.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            now = datetime.now(timezone.utc)
            usuario.activo = False
            usuario.deleted_at = now
            usuario.updated_at = now
            uow.usuarios.add(usuario)

    # ========================================================================
    # ROLES
    # ========================================================================

    def asignar_rol(self, usuario_id: int, rol_codigo: str) -> UsuarioDetail:
        """
        Asignar rol a usuario.
        
        Args:
            usuario_id: ID del usuario
            rol_codigo: Código del rol
            
        Returns:
            Usuario actualizado
            
        Raises:
            HTTPException: Si usuario o rol no existen
        """
        with UsuarioUnitOfWork(self._session) as uow:
            usuario = uow.usuarios.get_by_id(usuario_id)
            if not usuario or not usuario.activo or usuario.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            rol = uow.roles.get_by_codigo(rol_codigo)
            if not rol:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Rol no encontrado",
                )

            existing = uow._session.query(UsuarioRol).filter(
                UsuarioRol.usuario_id == usuario_id,
                UsuarioRol.rol_codigo == rol_codigo,
            ).first()

            if not existing:
                usuario_rol = UsuarioRol(
                    usuario_id=usuario_id,
                    rol_codigo=rol_codigo,
                )
                uow._session.add(usuario_rol)
                uow._session.flush()

            uow._session.refresh(usuario)

        return self._to_detail(usuario)

    def remover_rol(self, usuario_id: int, rol_codigo: str) -> UsuarioDetail:
        """
        Remover rol de usuario.
        
        Args:
            usuario_id: ID del usuario
            rol_codigo: Código del rol
            
        Returns:
            Usuario actualizado
            
        Raises:
            HTTPException: Si usuario no existe
        """
        with UsuarioUnitOfWork(self._session) as uow:
            usuario = uow.usuarios.get_by_id(usuario_id)
            if not usuario or not usuario.activo or usuario.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            uow._session.query(UsuarioRol).filter(
                UsuarioRol.usuario_id == usuario_id,
                UsuarioRol.rol_codigo == rol_codigo,
            ).delete()

            uow._session.flush()
            uow._session.refresh(usuario)

        return self._to_detail(usuario)

    # ========================================================================
    # DIRECCIONES DE ENTREGA
    # ========================================================================

    def crear_direccion(self, usuario_id: int, data: DireccionEntregaCreate) -> DireccionEntregaPublic:
        """
        Crear dirección de entrega para usuario.
        
        Args:
            usuario_id: ID del usuario
            data: Datos de la dirección
            
        Returns:
            Dirección creada
            
        Raises:
            HTTPException: Si usuario no existe
        """
        with UsuarioUnitOfWork(self._session) as uow:
            usuario = uow.usuarios.get_by_id(usuario_id)
            if not usuario or not usuario.activo or usuario.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )

            if data.es_principal:
                principal = uow.direcciones.get_principal_by_usuario(usuario_id)
                if principal:
                    principal.es_principal = False
                    uow._session.add(principal)

            direccion = DireccionEntrega(
                usuario_id=usuario_id,
                alias=data.alias,
                linea1=data.linea1,
                linea2=data.linea2,
                ciudad=data.ciudad,
                provincia=data.provincia,
                codigo_postal=data.codigo_postal,
                es_principal=data.es_principal,
                activo=True,
            )

            direccion = uow.direcciones.add(direccion)

        return self._direccion_to_public(direccion)

    def get_direccion(self, usuario_id: int, direccion_id: int) -> DireccionEntregaPublic:
        """
        Obtener dirección de usuario.
        
        Args:
            usuario_id: ID del usuario
            direccion_id: ID de la dirección
            
        Returns:
            Dirección
            
        Raises:
            HTTPException: Si dirección no existe o no pertenece al usuario
        """
        repo = DireccionEntregaRepository(self._session)
        direccion = repo.get_by_id(direccion_id)
        if not direccion or direccion.usuario_id != usuario_id or not direccion.activo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección no encontrada",
            )
        
        return self._direccion_to_public(direccion)

    def list_direcciones(self, usuario_id: int, offset: int = 0, limit: int = 20) -> DireccionEntregaList:
        """
        Listar direcciones de usuario.
        
        Args:
            usuario_id: ID del usuario
            offset: Offset de paginación
            limit: Límite de resultados
            
        Returns:
            Lista paginada de direcciones
        """
        repo = DireccionEntregaRepository(self._session)
        direcciones = repo.get_by_usuario_id(
            usuario_id,
            offset=offset,
            limit=limit,
        )
        total = len(direcciones)  # Simplificado; en producción usar conteo
        
        return DireccionEntregaList(
            data=[self._direccion_to_public(d) for d in direcciones],
            total=total,
        )

    def update_direccion(
        self,
        usuario_id: int,
        direccion_id: int,
        data: DireccionEntregaUpdate,
    ) -> DireccionEntregaPublic:
        """
        Actualizar dirección de entrega.
        
        Args:
            usuario_id: ID del usuario
            direccion_id: ID de la dirección
            data: Datos a actualizar
            
        Returns:
            Dirección actualizada
            
        Raises:
            HTTPException: Si dirección no existe o no pertenece al usuario
        """
        with UsuarioUnitOfWork(self._session) as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or not direccion.activo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            if data.es_principal:
                principal = uow.direcciones.get_principal_by_usuario(usuario_id)
                if principal and principal.id != direccion_id:
                    principal.es_principal = False
                    uow._session.add(principal)

            if data.alias is not None:
                direccion.alias = data.alias
            if data.linea1 is not None:
                direccion.linea1 = data.linea1
            if data.linea2 is not None:
                direccion.linea2 = data.linea2
            if data.ciudad is not None:
                direccion.ciudad = data.ciudad
            if data.provincia is not None:
                direccion.provincia = data.provincia
            if data.codigo_postal is not None:
                direccion.codigo_postal = data.codigo_postal
            if data.es_principal is not None:
                direccion.es_principal = data.es_principal

            uow.direcciones.add(direccion)

        return self._direccion_to_public(direccion)

    def set_direccion_principal(self, usuario_id: int, direccion_id: int) -> DireccionEntregaPublic:
        with UsuarioUnitOfWork(self._session) as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or not direccion.activo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            principal_actual = uow.direcciones.get_principal_by_usuario(usuario_id)
            if principal_actual and principal_actual.id != direccion.id:
                principal_actual.es_principal = False
                uow._session.add(principal_actual)

            direccion.es_principal = True
            uow.direcciones.add(direccion)

        return self._direccion_to_public(direccion)

    def delete_direccion(self, usuario_id: int, direccion_id: int) -> None:
        """
        Soft-delete de dirección.
        
        Args:
            usuario_id: ID del usuario
            direccion_id: ID de la dirección
            
        Raises:
            HTTPException: Si dirección no existe o no pertenece al usuario
        """
        with UsuarioUnitOfWork(self._session) as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or not direccion.activo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada",
                )

            now = datetime.now(timezone.utc)
            direccion.activo = False
            direccion.deleted_at = now
            direccion.updated_at = now
            uow.direcciones.add(direccion)

    # ========================================================================
    # HELPERS
    # ========================================================================

    def _to_public(self, usuario: Usuario) -> UsuarioPublic:
        """Convertir Usuario a UsuarioPublic."""
        return UsuarioPublic(
            id=usuario.id,
            nombre=usuario.nombre,
            apellido=usuario.apellido,
            email=usuario.email,
            celular=usuario.celular,
            activo=usuario.activo,
        )

    def _to_detail(self, usuario: Usuario) -> UsuarioDetail:
        """Convertir Usuario a UsuarioDetail."""
        roles = [
            RolPublic(
                codigo=ur.rol.codigo,
                nombre=ur.rol.nombre,
                descripcion=ur.rol.descripcion,
            )
            for ur in usuario.usuarios_roles
        ]
        
        direcciones = [
            self._direccion_to_public(d)
            for d in usuario.direcciones
            if d.activo and d.deleted_at is None
        ]
        
        return UsuarioDetail(
            id=usuario.id,
            nombre=usuario.nombre,
            apellido=usuario.apellido,
            email=usuario.email,
            celular=usuario.celular,
            activo=usuario.activo,
            roles=roles,
            direcciones=direcciones,
            created_at=usuario.created_at,
            updated_at=usuario.updated_at,
        )

    def _direccion_to_public(self, direccion: DireccionEntrega) -> DireccionEntregaPublic:
        """Convertir DireccionEntrega a DireccionEntregaPublic."""
        return DireccionEntregaPublic(
            id=direccion.id,
            alias=direccion.alias,
            linea1=direccion.linea1,
            linea2=direccion.linea2,
            ciudad=direccion.ciudad,
            provincia=direccion.provincia,
            codigo_postal=direccion.codigo_postal,
            es_principal=direccion.es_principal,
            activo=direccion.activo,
        )
