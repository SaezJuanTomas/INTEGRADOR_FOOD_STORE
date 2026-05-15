"""
AuthService: Lógica de autenticación y autorización.
"""

from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.security import hash_password, verify_password, JWTHandler
from app.models import Usuario, Rol
from app.modules.usuarios.repository import UsuarioRepository
from app.modules.usuarios.schemas import (
    UsuarioCreate,
    UsuarioPublic,
    LoginRequest,
    TokenResponse,
    CurrentUser,
)


class AuthService:
    """
    Servicio de autenticación.
    Maneja login, token generation, y token verification.
    """

    def __init__(self, session: Session):
        self._session = session
        self._usuario_repo = UsuarioRepository(session)

    def register(self, data: UsuarioCreate) -> UsuarioPublic:
        """
        Registrar nuevo usuario.
        
        Args:
            data: Datos para crear usuario
            
        Returns:
            Usuario creado
            
        Raises:
            HTTPException: Si email ya existe
        """
        # Verificar email único
        existing = self._usuario_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya registrado",
            )
        
        # Crear usuario
        usuario = Usuario(
            nombre=data.nombre,
            apellido=data.apellido,
            email=data.email,
            celular=data.celular,
            password_hash=hash_password(data.password),
            activo=True,
        )
        
        usuario = self._usuario_repo.add(usuario)
        self._session.commit()
        
        return self._to_public(usuario)

    def login(self, data: LoginRequest) -> TokenResponse:
        """
        Autenticar usuario y generar token.
        
        Args:
            data: Email y contraseña
            
        Returns:
            Token JWT y información del usuario
            
        Raises:
            HTTPException: Si credenciales son inválidas
        """
        # Buscar usuario
        usuario = self._usuario_repo.get_by_email(data.email)
        if not usuario or not usuario.activo or usuario.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )
        
        # Verificar contraseña
        if not verify_password(data.password, usuario.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )
        
        # Obtener roles
        roles = [ur.rol.codigo for ur in usuario.usuarios_roles]
        
        # Generar token
        token_data = {
            "sub": str(usuario.id),
            "email": usuario.email,
            "roles": roles,
        }
        
        token = JWTHandler.create_token(
            token_data,
            expires_delta=timedelta(hours=24),
        )
        
        return TokenResponse(
            access_token=token,
            token_type="Bearer",
            usuario=self._to_public(usuario),
        )

    def verify_token(self, token: str) -> Optional[CurrentUser]:
        """
        Verificar token y retornar usuario actual.
        
        Args:
            token: JWT token
            
        Returns:
            CurrentUser si es válido, None si no
        """
        payload = JWTHandler.verify_token(token)
        if not payload:
            return None
        
        usuario_id = int(payload.get("sub", -1))
        if usuario_id < 0:
            return None
        
        usuario = self._usuario_repo.get_by_id(usuario_id)
        if not usuario or not usuario.activo or usuario.deleted_at is not None:
            return None
        
        roles = [ur.rol.codigo for ur in usuario.usuarios_roles]
        
        return CurrentUser(
            id=usuario.id,
            nombre=usuario.nombre,
            apellido=usuario.apellido,
            email=usuario.email,
            celular=usuario.celular,
            activo=usuario.activo,
            roles=roles,
        )

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
