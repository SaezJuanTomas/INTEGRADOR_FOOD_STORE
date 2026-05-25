"""
Usuarios Router: Endpoints para gestión de usuarios, roles y direcciones.
GET /usuarios - Listar usuarios
GET /usuarios/{usuario_id} - Obtener usuario
PUT /usuarios/{usuario_id} - Actualizar usuario
DELETE /usuarios/{usuario_id} - Eliminar usuario

GET /usuarios/{usuario_id}/roles - Listar roles del usuario
POST /usuarios/{usuario_id}/roles/{rol_codigo} - Asignar rol
DELETE /usuarios/{usuario_id}/roles/{rol_codigo} - Remover rol

GET /usuarios/{usuario_id}/direcciones - Listar direcciones
POST /usuarios/{usuario_id}/direcciones - Crear dirección
GET /usuarios/{usuario_id}/direcciones/{direccion_id} - Obtener dirección
PUT /usuarios/{usuario_id}/direcciones/{direccion_id} - Actualizar dirección
DELETE /usuarios/{usuario_id}/direcciones/{direccion_id} - Eliminar dirección
"""

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlmodel import Session

from app.core.deps import get_current_active_user, require_roles
from app.core.database import get_session
from app.core.rbac import ROLE_ADMIN
from app.modules.usuarios.service import UsuarioService
from app.modules.usuarios.schemas import (
    UsuarioPublic,
    UsuarioUpdate,
    UsuarioDetail,
    UsuarioList,
    DireccionEntregaCreate,
    DireccionEntregaUpdate,
    DireccionEntregaPublic,
    DireccionEntregaList,
    CurrentUser,
)

router = APIRouter()


def get_usuario_service(session: Session = Depends(get_session)) -> UsuarioService:
    """Dependency para obtener el UsuarioService."""
    return UsuarioService(session)


def _ensure_self_or_admin(current_user: CurrentUser, usuario_id: int) -> None:
    if current_user.id != usuario_id and ROLE_ADMIN not in current_user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")


# ============================================================================
# USUARIOS - CRUD
# ============================================================================

@router.get("", response_model=UsuarioList)
def list_usuarios(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    include_inactive: bool = Query(default=False),
    _: CurrentUser = Depends(require_roles([ROLE_ADMIN])),
    svc: UsuarioService = Depends(get_usuario_service),
) -> UsuarioList:
    """
    Listar usuarios activos con paginación.
    
    Parámetros:
    - **offset**: Número de registros a saltar (default: 0)
    - **limit**: Número máximo de registros (default: 20, max: 100)
    - **include_inactive**: Incluir usuarios inactivos (default: false)
    """
    return svc.list_usuarios(
        offset=offset,
        limit=limit,
        include_inactive=include_inactive,
    )


@router.get("/{usuario_id}", response_model=UsuarioDetail)
def get_usuario(
    usuario_id: int,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> UsuarioDetail:
    """
    Obtener detalle de usuario con roles y direcciones.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.get_usuario(usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioDetail)
def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> UsuarioDetail:
    """
    Actualizar datos del usuario.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **nombre**: Nuevo nombre (opcional)
    - **apellido**: Nuevo apellido (opcional)
    - **celular**: Nuevo teléfono (opcional)
    - **activo**: Activar/desactivar usuario (opcional)
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.update_usuario(usuario_id, data)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    usuario_id: int,
    _: CurrentUser = Depends(require_roles([ROLE_ADMIN])),
    svc: UsuarioService = Depends(get_usuario_service),
) -> None:
    """
    Soft-delete de usuario (marcado como inactivo).
    
    Parámetros:
    - **usuario_id**: ID del usuario
    """
    svc.delete_usuario(usuario_id)


# ============================================================================
# ROLES
# ============================================================================

@router.post("/{usuario_id}/roles/{rol_codigo}", response_model=UsuarioDetail, status_code=status.HTTP_201_CREATED)
def asignar_rol(
    usuario_id: int,
    rol_codigo: str,
    _: CurrentUser = Depends(require_roles([ROLE_ADMIN])),
    svc: UsuarioService = Depends(get_usuario_service),
) -> UsuarioDetail:
    """
    Asignar rol a usuario (si no lo tiene ya).
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **rol_codigo**: Código del rol (e.g., ADMIN, CLIENTE)
    """
    return svc.asignar_rol(usuario_id, rol_codigo)


@router.delete("/{usuario_id}/roles/{rol_codigo}", response_model=UsuarioDetail)
def remover_rol(
    usuario_id: int,
    rol_codigo: str,
    _: CurrentUser = Depends(require_roles([ROLE_ADMIN])),
    svc: UsuarioService = Depends(get_usuario_service),
) -> UsuarioDetail:
    """
    Remover rol de usuario.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **rol_codigo**: Código del rol
    """
    return svc.remover_rol(usuario_id, rol_codigo)


# ============================================================================
# DIRECCIONES DE ENTREGA
# ============================================================================

@router.post("/{usuario_id}/direcciones", response_model=DireccionEntregaPublic, status_code=status.HTTP_201_CREATED)
def crear_direccion(
    usuario_id: int,
    data: DireccionEntregaCreate,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> DireccionEntregaPublic:
    """
    Crear nueva dirección de entrega para usuario.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **alias**: Alias para la dirección (e.g., Casa, Trabajo)
    - **linea1**: Calle y número
    - **linea2**: Apartamento, piso, etc. (opcional)
    - **ciudad**: Ciudad
    - **provincia**: Provincia/Estado
    - **codigo_postal**: Código postal
    - **es_principal**: Si es la dirección principal (default: false)
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.crear_direccion(usuario_id, data)


@router.get("/{usuario_id}/direcciones", response_model=DireccionEntregaList)
def list_direcciones(
    usuario_id: int,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> DireccionEntregaList:
    """
    Listar direcciones de entrega del usuario.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **offset**: Número de registros a saltar
    - **limit**: Número máximo de registros
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.list_direcciones(usuario_id, offset=offset, limit=limit)


@router.get("/{usuario_id}/direcciones/{direccion_id}", response_model=DireccionEntregaPublic)
def get_direccion(
    usuario_id: int,
    direccion_id: int,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> DireccionEntregaPublic:
    """
    Obtener detalle de dirección de entrega.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **direccion_id**: ID de la dirección
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.get_direccion(usuario_id, direccion_id)


@router.put("/{usuario_id}/direcciones/{direccion_id}", response_model=DireccionEntregaPublic)
def update_direccion(
    usuario_id: int,
    direccion_id: int,
    data: DireccionEntregaUpdate,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> DireccionEntregaPublic:
    """
    Actualizar dirección de entrega.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **direccion_id**: ID de la dirección
    - **alias**: Nuevo alias (opcional)
    - **linea1**: Nueva calle (opcional)
    - **linea2**: Apartamento, piso, etc. (opcional)
    - **ciudad**: Nueva ciudad (opcional)
    - **provincia**: Nueva provincia (opcional)
    - **codigo_postal**: Nuevo código postal (opcional)
    - **es_principal**: Cambiar si es principal (opcional)
    """
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.update_direccion(usuario_id, direccion_id, data)


@router.patch("/{usuario_id}/direcciones/{direccion_id}/principal", response_model=DireccionEntregaPublic)
def set_direccion_principal(
    usuario_id: int,
    direccion_id: int,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> DireccionEntregaPublic:
    _ensure_self_or_admin(current_user, usuario_id)
    return svc.set_direccion_principal(usuario_id, direccion_id)


@router.delete("/{usuario_id}/direcciones/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_direccion(
    usuario_id: int,
    direccion_id: int,
    current_user: CurrentUser = Depends(get_current_active_user),
    svc: UsuarioService = Depends(get_usuario_service),
) -> None:
    """
    Soft-delete de dirección de entrega.
    
    Parámetros:
    - **usuario_id**: ID del usuario
    - **direccion_id**: ID de la dirección
    """
    _ensure_self_or_admin(current_user, usuario_id)
    svc.delete_direccion(usuario_id, direccion_id)
