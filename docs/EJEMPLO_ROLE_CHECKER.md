# Usando Role Checker para Proteger Endpoints

## Resumen de cambios

Se han implementado las siguientes características de seguridad según las notas de clase:

### 1. Cookies HttpOnly para Login y Token

**¿Qué hace?**
- El endpoint `POST /auth/login` ahora establece automáticamente una cookie `httponly` con el JWT token
- La cookie es segura (no accesible desde JavaScript), protegiendo contra ataques XSS
- El token se devuelve también en el JSON de respuesta (compatibilidad con clientes anteriores)

**Características de la cookie:**
- **httponly**: No accesible desde JavaScript
- **samesite=lax**: Protege contra ataques CSRF
- **max_age**: 24 horas
- **secure**: Cambiar a `True` en producción (requiere HTTPS)

### 2. Función `role_checker` para Proteger Endpoints

**¿Qué hace?**
- Verifica si el usuario autenticado tiene los roles requeridos
- Si el usuario no tiene acceso, retorna `403 Forbidden` con detalles
- Funciona en combinación con `get_current_user`

## Ejemplos de uso

### Ejemplo 1: Endpoint solo para ADMIN

```python
from fastapi import APIRouter, Depends
from app.modules.auth.router import role_checker
from app.modules.usuarios.schemas import CurrentUser

router = APIRouter()

@router.get("/admin-panel")
def admin_panel(
    current_user: CurrentUser = Depends(role_checker(["ADMIN"]))
) -> dict:
    """Solo usuarios con rol ADMIN pueden acceder."""
    return {
        "message": "Bienvenido al panel de administración",
        "usuario": current_user.email,
        "roles": current_user.roles
    }
```

### Ejemplo 2: Endpoint para múltiples roles (ADMIN O GERENTE)

```python
@router.get("/reportes")
def ver_reportes(
    current_user: CurrentUser = Depends(role_checker(["ADMIN", "GERENTE"]))
) -> dict:
    """Usuarios con rol ADMIN o GERENTE pueden acceder."""
    return {
        "message": "Reportes del sistema",
        "acceso_otorgado_por": current_user.roles
    }
```

### Ejemplo 3: Endpoint protegido solo para CLIENTE

```python
@router.get("/mis-pedidos")
def mis_pedidos(
    current_user: CurrentUser = Depends(role_checker(["CLIENTE"]))
) -> dict:
    """Solo usuarios con rol CLIENTE pueden ver sus pedidos."""
    return {
        "usuario_id": current_user.id,
        "pedidos": []  # Aquí iría la lógica real
    }
```

## Cambios en el archivo `app/modules/auth/router.py`

### 1. Nuevo endpoint `/logout`
```
POST /auth/logout
```
Limpia la cookie httponly de la sesión.

**Respuesta:**
```json
{
  "message": "Sesión cerrada correctamente"
}
```

### 2. Función `get_current_user` mejorada

Ahora acepta el token desde:
1. **Cookie httponly** (prioritaria) - automática después del login
2. **Authorization header** - para compatibilidad con clientes que envían Bearer token

### 3. Nueva función `role_checker`

```python
def role_checker(required_roles: List[str])
```

**Parámetros:**
- `required_roles`: Lista de códigos de rol permitidos (ej: `["ADMIN", "GERENTE"]`)

**Retorna:**
- Función dependency que verifica los roles

**Errores:**
- `403 Forbidden`: Si el usuario no tiene los roles requeridos
- `401 Unauthorized`: Si no hay token válido

## Cómo integrar en otros routers

### Paso 1: Importar en tu router
```python
from app.modules.auth.router import role_checker
from app.modules.usuarios.schemas import CurrentUser
```

### Paso 2: Usar en tus endpoints
```python
@router.delete("/productos/{id}")
def eliminar_producto(
    id: int,
    current_user: CurrentUser = Depends(role_checker(["ADMIN"]))
) -> dict:
    """Solo ADMIN puede eliminar productos."""
    # Lógica para eliminar
    return {"message": f"Producto {id} eliminado"}
```

## Ejemplos de requests

### 1. Login y obtener cookie
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
- El token en JSON para clientes que lo necesiten
- Una cookie `access_token` httponly para requests automáticos

### 2. Usar la cookie automáticamente en siguiente request
```bash
curl -X GET http://localhost:8000/auth/me
```

La cookie se envía automáticamente desde el navegador/cliente.

### 3. Alternativamente, usar Authorization header
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

### 4. Acceder a endpoint protegido por rol
```bash
curl -X GET http://localhost:8000/admin-panel
```

Si el usuario no tiene rol ADMIN:
```json
{
  "detail": "Access denied. Required roles: ADMIN. User roles: CLIENTE"
}
```

### 5. Logout
```bash
curl -X POST http://localhost:8000/auth/logout
```

La cookie se elimina del cliente.

## Flujo de autenticación actualizado

```
1. Usuario hace login (POST /auth/login)
   ↓
2. Backend verifica credenciales ✓
   ↓
3. Backend crea JWT token
   ↓
4. Backend:
   - Devuelve token en JSON
   - Establece cookie httponly con token
   ↓
5. Cliente recibe:
   - Token en JSON (opcional para guardar)
   - Cookie httponly (automática en siguiente request)
   ↓
6. Cliente accede a endpoint protegido
   - Cookie se envía automáticamente
   ↓
7. Servidor verifica:
   - Obtiene token de cookie
   - Verifica firma del JWT
   - Verifica roles del usuario
   ↓
8. Si todo está bien → Acceso permitido ✓
   Si roles insuficientes → 403 Forbidden
   Si token inválido/expirado → 401 Unauthorized
```

## Notas de seguridad

### Cookies HttpOnly (según notas de clase)
✅ **Ventajas:**
- Protege contra ataques XSS (JavaScript no puede acceder)
- Se envía automáticamente en cada request
- Más seguro que localStorage

❌ **Desventajas en desarrollo:**
- Cambiar `secure=True` cuando uses HTTPS en producción
- Los navegadores requieren HTTPS en producción

### Role Checker (según notas de clase)
✅ **Beneficios:**
- Control de acceso granular
- Protección de endpoints sensibles
- Auditoría: cada request sabe quién accede
- Fácil de usar en cualquier endpoint

## Próximos pasos

1. **Integrar role_checker en endpoints existentes:**
   - Productos (DELETE solo para ADMIN)
   - Categorías (POST/PUT/DELETE solo para ADMIN)
   - Pedidos (acceso según rol)

2. **En producción:**
   - Cambiar `secure=True` en cookies (requiere HTTPS)
   - Cambiar SECRET_KEY en `app/core/security.py`
   - Usar salt dinámico para hashing de contraseñas

3. **Mejorar logs:**
   - Registrar intentos de acceso denegado
   - Auditoría de operaciones sensibles
