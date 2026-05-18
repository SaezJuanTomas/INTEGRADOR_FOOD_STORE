"""
Auth Router: Endpoints para autenticación.
POST /auth/register - Registrar nuevo usuario
POST /auth/login - Login con cookies httponly
GET /auth/me - Usuario actual (requiere token en cookie o header)
GET /auth/logout - Limpiar cookie de sesión
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header, Response, status, Cookie
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

# Constantes para cookies
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 24 * 60 * 60  # 24 horas en segundos


def get_auth_service(session: Session = Depends(get_session)) -> AuthService:
    """Dependency para obtener el AuthService."""
    return AuthService(session)


def get_current_user(
    authorization: str | None = Header(None),
    access_token: str | None = Cookie(None),
    svc: AuthService = Depends(get_auth_service),
) -> CurrentUser:
    """
    Dependency para obtener usuario actual desde token JWT.
    Acepta token desde:
    1. Cookie httponly (prioritaria)
    2. Header Authorization: Bearer <token>
    
    Se usa en endpoints protegidos.
    """
    token = None
    
    # Primero intentar obtener token desde cookie
    if access_token:
        token = access_token
    # Si no hay cookie, intentar obtener desde header
    elif authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0] == "Bearer":
            token = parts[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided. Use cookie or Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = svc.verify_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def role_checker(required_roles: List[str]):
    """
    Dependency factory para proteger endpoints que requieren roles específicos.
    
    Uso:
        @router.get("/admin")
        def admin_endpoint(current_user: CurrentUser = Depends(role_checker(["ADMIN"]))):
            return {"message": "Admin access granted"}
    
    Args:
        required_roles: Lista de códigos de rol permitidos (ej: ["ADMIN", "GERENTE"])
    
    Returns:
        Función dependency que verifica los roles del usuario actual
    """
    async def check_role(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        # Verificar si el usuario tiene al menos uno de los roles requeridos
        user_roles = set(current_user.roles)
        required_set = set(required_roles)
        
        if not user_roles.intersection(required_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}. "
                       f"User roles: {', '.join(current_user.roles)}",
            )
        
        return current_user
    
    return check_role


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
    response: Response,
    svc: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """
    Autenticar usuario y obtener JWT token.
    
    El token se devuelve de dos formas:
    1. En la respuesta JSON (acceso_token)
    2. En una cookie httponly (para usar automáticamente en requests posteriores)
    
    Parámetros:
    - **email**: Email del usuario
    - **password**: Contraseña
    
    Retorna:
    - **access_token**: JWT token para usar en Authorization header (o usará la cookie)
    - **token_type**: Tipo de token (Bearer)
    - **usuario**: Información del usuario autenticado
    """
    token_response = svc.login(data)
    
    # Establecer cookie httponly con el token
    response.set_cookie(
        key=COOKIE_NAME,
        value=token_response.access_token,
        max_age=COOKIE_MAX_AGE,
        expires=COOKIE_MAX_AGE,
        httponly=True,  # No accesible desde JavaScript (protege contra XSS)
        secure=False,   # Cambiar a True en producción (requiere HTTPS)
        samesite="lax",  # Protege contra CSRF
    )
    
    return token_response


@router.get("/me", response_model=CurrentUser)
def get_me(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """
    Obtener información del usuario autenticado.
    
    Requiere autenticación por:
    - Cookie httponly (automática después del login)
    - O Authorization header con JWT token válido
    
    Ejemplo:
    ```
    GET /auth/me
    (cookie se envía automáticamente)
    
    O alternamente:
    GET /auth/me
    Authorization: Bearer eyJhbGc...
    ```
    
    Retorna información del usuario actual incluyendo sus roles.
    """
    return current_user


@router.post("/logout")
def logout(response: Response) -> dict:
    """
    Limpiar la sesión eliminando la cookie httponly.
    
    Retorna:
    - **message**: Confirmación de logout
    """
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        samesite="lax",
    )
    return {"message": "Sesión cerrada correctamente"}

