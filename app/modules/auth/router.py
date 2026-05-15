"""
Auth Router: Endpoints para autenticación.
POST /auth/register - Registrar nuevo usuario
POST /auth/login - Login
GET /auth/me - Usuario actual (requiere token)
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session

from app.core.database import get_session
from app.modules.usuarios.auth_service import AuthService
from app.modules.usuarios.schemas import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioPublic,
    CurrentUser,
)

router = APIRouter()


def get_auth_service(session: Session = Depends(get_session)) -> AuthService:
    """Dependency para obtener el AuthService."""
    return AuthService(session)


def get_current_user(
    authorization: str | None = Header(None),
    svc: AuthService = Depends(get_auth_service),
) -> CurrentUser:
    """
    Dependency para obtener usuario actual desde token JWT.
    Se usa en endpoints protegidos.
    
    Formato del header: Authorization: Bearer <token>
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Formato: "Bearer <token>"
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    user = svc.verify_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


@router.post("/register", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
def register(
    data: UsuarioCreate,
    svc: AuthService = Depends(get_auth_service),
) -> UsuarioPublic:
    """
    Registrar nuevo usuario.
    
    Parámetros:
    - **nombre**: Nombre del usuario
    - **apellido**: Apellido del usuario
    - **email**: Email único
    - **celular**: Teléfono (opcional)
    - **password**: Contraseña (mínimo 8 caracteres)
    
    Retorna el usuario creado.
    """
    return svc.register(data)


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    svc: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """
    Autenticar usuario y obtener JWT token.
    
    Parámetros:
    - **email**: Email del usuario
    - **password**: Contraseña
    
    Retorna:
    - **access_token**: JWT token para usar en Authorization header
    - **token_type**: Tipo de token (Bearer)
    - **usuario**: Información del usuario autenticado
    
    Uso del token: Authorization: Bearer <access_token>
    """
    return svc.login(data)


@router.get("/me", response_model=CurrentUser)
def get_me(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """
    Obtener información del usuario autenticado.
    
    Requiere Authorization header con JWT token válido.
    
    Ejemplo:
    ```
    GET /auth/me
    Authorization: Bearer eyJhbGc...
    ```
    
    Retorna información del usuario actual incluyendo sus roles.
    """
    return current_user

