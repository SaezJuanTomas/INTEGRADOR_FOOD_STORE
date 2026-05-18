# Protegiendo Endpoints con role_checker - Ejemplos Prácticos

## Concepto

Después de implementar `role_checker`, puedes proteger cualquier endpoint verificando que el usuario tenga los roles necesarios. La función lanza **403 Forbidden** si el usuario no tiene acceso.

---

## Ejemplo 1: Router de Productos

El router actual permite crear, actualizar y eliminar productos a cualquier usuario. Vamos a protegerlo:

### Código Original (SIN protección)
```python
from fastapi import APIRouter, Depends, status
from app.modules.productos.service import ProductoService

router = APIRouter()

@router.post("/", response_model=ProductoPublic, status_code=status.HTTP_201_CREATED)
def create_producto(
    data: ProductoCreate,
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoPublic:
    return svc.create(data)

@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
) -> None:
    svc.soft_delete(producto_id)
```

### Código Mejorado (CON protección)
```python
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.modules.productos.service import ProductoService
from app.modules.auth.router import role_checker  # ← IMPORTAR
from app.modules.usuarios.schemas import CurrentUser  # ← IMPORTAR

router = APIRouter()

def get_producto_service(session: Session = Depends(get_session)) -> ProductoService:
    return ProductoService(session)

# GET /productos - PÚBLICO (sin protección)
@router.get("/", response_model=ProductoList)
def list_productos(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    include_deleted: bool = Query(default=False),
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoList:
    """Listar productos - Sin autenticación requerida"""
    return svc.get_all(offset=offset, limit=limit, include_deleted=include_deleted)

# GET /productos/{id} - PÚBLICO (sin protección)
@router.get("/{producto_id}", response_model=ProductoPublic)
def get_producto(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoPublic:
    """Ver detalles de un producto - Sin autenticación requerida"""
    return svc.get_by_id(producto_id)

# POST /productos - SOLO ADMIN
@router.post("/", response_model=ProductoPublic, status_code=status.HTTP_201_CREATED)
def create_producto(
    data: ProductoCreate,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),  # ← PROTEGIDO
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoPublic:
    """Crear nuevo producto - Solo ADMIN"""
    print(f"Producto creado por: {current_user.email}")
    return svc.create(data)

# PATCH /productos/{id} - SOLO ADMIN
@router.patch("/{producto_id}", response_model=ProductoPublic)
def update_producto(
    producto_id: int,
    data: ProductoUpdate,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),  # ← PROTEGIDO
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoPublic:
    """Actualizar producto - Solo ADMIN"""
    print(f"Producto actualizado por: {current_user.email}")
    return svc.update(producto_id, data)

# DELETE /productos/{id} - SOLO ADMIN
@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(
    producto_id: int,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),  # ← PROTEGIDO
    svc: ProductoService = Depends(get_producto_service),
) -> None:
    """Eliminar producto - Solo ADMIN"""
    print(f"Producto eliminado por: {current_user.email}")
    svc.soft_delete(producto_id)

# PATCH /productos/{id}/restore - SOLO ADMIN
@router.patch("/{producto_id}/restore", response_model=ProductoPublic)
def restore_producto(
    producto_id: int,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),  # ← PROTEGIDO
    svc: ProductoService = Depends(get_producto_service),
) -> ProductoPublic:
    """Restaurar producto eliminado - Solo ADMIN"""
    print(f"Producto restaurado por: {current_user.email}")
    return svc.restore(producto_id)
```

---

## Ejemplo 2: Router de Categorías

```python
from fastapi import APIRouter, Depends, status
from app.modules.auth.router import role_checker
from app.modules.usuarios.schemas import CurrentUser

router = APIRouter()

# GET /categorias - PÚBLICO
@router.get("/", response_model=CategoriaList)
def list_categorias(
    offset: int = 0,
    limit: int = 20,
    svc = Depends(get_categoria_service),
):
    """Listar categorías - Público"""
    return svc.get_all(offset=offset, limit=limit)

# POST /categorias - SOLO ADMIN
@router.post("/", response_model=CategoriaPublic, status_code=status.HTTP_201_CREATED)
def create_categoria(
    data: CategoriaCreate,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),
    svc = Depends(get_categoria_service),
):
    """Crear categoría - Solo ADMIN"""
    return svc.create(data)

# DELETE /categorias/{id} - SOLO ADMIN
@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categoria(
    categoria_id: int,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),
    svc = Depends(get_categoria_service),
):
    """Eliminar categoría - Solo ADMIN"""
    svc.soft_delete(categoria_id)
```

---

## Ejemplo 3: Router de Pedidos (Más Complejo)

```python
from fastapi import APIRouter, Depends, status
from app.modules.auth.router import role_checker, get_current_user
from app.modules.usuarios.schemas import CurrentUser

router = APIRouter()

# GET /pedidos - SOLO ADMIN (ver todos) O CLIENTE (ver propios)
@router.get("/", response_model=PedidoList)
def list_pedidos(
    current_user: CurrentUser = Depends(get_current_user),  # Requiere auth, pero flexible en roles
    offset: int = 0,
    limit: int = 20,
    svc = Depends(get_pedido_service),
):
    """
    Listar pedidos:
    - ADMIN: Ver todos los pedidos
    - CLIENTE: Ver solo sus pedidos
    """
    if "ADMIN" in current_user.roles:
        # Admin ve todos los pedidos
        return svc.get_all(offset=offset, limit=limit)
    else:
        # Cliente ve solo sus pedidos
        return svc.get_by_usuario(current_user.id, offset=offset, limit=limit)

# POST /pedidos - SOLO CLIENTE
@router.post("/", response_model=PedidoPublic, status_code=status.HTTP_201_CREATED)
def create_pedido(
    data: PedidoCreate,
    current_user: CurrentUser = Depends(role_checker(["CLIENTE"])),  # Solo CLIENTE
    svc = Depends(get_pedido_service),
):
    """Crear nuevo pedido - Solo CLIENTE"""
    # Asignar el usuario actual al pedido
    data.usuario_id = current_user.id
    return svc.create(data)

# PATCH /pedidos/{id}/confirmar - SOLO ADMIN (procesa el pedido)
@router.patch("/{pedido_id}/confirmar", response_model=PedidoPublic)
def confirmar_pedido(
    pedido_id: int,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"])),  # Solo ADMIN
    svc = Depends(get_pedido_service),
):
    """Confirmar pedido - Solo ADMIN"""
    return svc.confirmar(pedido_id)

# PATCH /pedidos/{id}/cancelar - ADMIN O CLIENTE (propietario)
@router.patch("/{pedido_id}/cancelar", response_model=PedidoPublic)
def cancelar_pedido(
    pedido_id: int,
    current_user: CurrentUser = Depends(get_current_user),  # Flexible
    svc = Depends(get_pedido_service),
):
    """
    Cancelar pedido:
    - ADMIN: Puede cancelar cualquier pedido
    - CLIENTE: Solo puede cancelar sus propios pedidos
    """
    # Obtener el pedido
    pedido = svc.get_by_id(pedido_id)
    
    # Verificar acceso
    if "ADMIN" not in current_user.roles and pedido.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para cancelar este pedido"
        )
    
    return svc.cancelar(pedido_id)

# GET /pedidos/{id} - ADMIN O CLIENTE (propietario)
@router.get("/{pedido_id}", response_model=PedidoDetail)
def get_pedido(
    pedido_id: int,
    current_user: CurrentUser = Depends(get_current_user),  # Flexible
    svc = Depends(get_pedido_service),
):
    """
    Ver detalles del pedido:
    - ADMIN: Ver cualquier pedido
    - CLIENTE: Solo sus propios pedidos
    """
    pedido = svc.get_by_id(pedido_id)
    
    if "ADMIN" not in current_user.roles and pedido.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este pedido"
        )
    
    return pedido
```

---

## Patrones de Uso

### Patrón 1: Endpoint Protegido por Rol
```python
@router.post("/admin-only")
def admin_only(
    current_user: CurrentUser = Depends(role_checker(["ADMIN"]))
):
    """Solo ADMIN"""
```

### Patrón 2: Múltiples Roles Permitidos
```python
@router.post("/gerentes-y-admin")
def gerentes_endpoint(
    current_user: CurrentUser = Depends(role_checker(["ADMIN", "GERENTE"]))
):
    """ADMIN o GERENTE pueden acceder"""
```

### Patrón 3: Flexible (Autenticado pero Roles Variables)
```python
@router.get("/mis-datos")
def mis_datos(
    current_user: CurrentUser = Depends(get_current_user)  # Sin role_checker
):
    """Cualquier usuario autenticado"""
```

### Patrón 4: Lógica Condicional Basada en Rol
```python
@router.get("/datos")
def obtener_datos(
    current_user: CurrentUser = Depends(get_current_user),
    svc = Depends(get_service),
):
    """Diferentes datos según el rol"""
    if "ADMIN" in current_user.roles:
        return svc.get_all_datos()
    else:
        return svc.get_datos_by_usuario(current_user.id)
```

---

## Pruebas

### Test 1: Cliente intenta crear producto (debe fallar)
```bash
# Login como cliente
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cliente@example.com", "password": "pass123"}'

# Respuesta incluye cookie + token
# Intentar crear producto
curl -X POST http://localhost:8000/productos/ \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Producto Nuevo", "precio": 100}'

# Resultado esperado:
# 403 Forbidden - "Access denied. Required roles: ADMIN. User roles: CLIENTE"
```

### Test 2: Admin crea producto (debe funcionar)
```bash
# Login como admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# Crear producto
curl -X POST http://localhost:8000/productos/ \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Producto Nuevo", "precio": 100}'

# Resultado esperado:
# 201 Created - Producto creado exitosamente
```

---

## Checklist de Implementación

- [ ] Importar `role_checker` y `CurrentUser` en el router
- [ ] Agregar `current_user: CurrentUser = Depends(role_checker([...]))` a endpoints sensibles
- [ ] POST/PUT/PATCH/DELETE → protegidos por ADMIN
- [ ] GET → públicos o con validación de propiedad
- [ ] Endpoints de usuario → solo el propietario o ADMIN
- [ ] Endpoints de pedido → lógica de propiedad o ADMIN
- [ ] Documentar en Swagger qué roles se requieren
- [ ] Probar con diferentes usuarios/roles

---

## Notas Importantes

1. **El orden importa**: `current_user: CurrentUser = Depends(role_checker([...]))` debe ir DESPUÉS de otros parámetros obligatorios (path, query).

2. **Cookies automáticas**: Después del login, la cookie se envía automáticamente. No necesitas especificar Authorization header.

3. **Mensajes de error claros**: role_checker devuelve 403 con detalles de qué roles se requieren.

4. **Auditoría**: Puedes loguear `current_user.email` en endpoints sensibles.

5. **Para desarrollo**: Las cookies funcionan sin HTTPS. En producción, cambiar `secure=True` en [app/modules/auth/router.py](app/modules/auth/router.py#L24).
