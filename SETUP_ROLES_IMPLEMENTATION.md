# 🎯 Implementación de Control de Acceso por Roles

### Frontend - Componentes Nuevos

1. **ProtectedRoute.tsx** - Validación de autenticación y roles
   - Redirige a `/login` si no está autenticado
   - Redirige a `/access-denied` si los roles no coinciden
   - Soporte para `requiredRoles` opcional

2. **CartContext.tsx** - Gestión del carrito de compras
   - Agregar/remover productos
   - Modificar cantidades
   - Calcular total

3. **NavBar.tsx** - Barra de navegación dinámica
   - Menú diferenciado para ADMIN vs CLIENTE
   - ADMIN: Home, Productos, Categorías, Ingredientes, Ventas
   - CLIENTE: Home, Productos, Carrito, Mis Pedidos, Perfil

4. **AdminDashboard.tsx** - Dashboard para administradores
   - 6 secciones: Categorías, Productos, Ingredientes, Ventas, Usuarios, Gastos

5. **ClienteDashboard.tsx** - Dashboard para clientes
   - 4 secciones: Productos, Carrito, Mis Pedidos, Perfil
   - Tips útiles para navegar

6. **CarritoPage.tsx** - Página del carrito
   - Mostrar productos con controles de cantidad
   - Calcular total
   - Botones: Seguir Comprando, Ir a Checkout

7. **MisPedidosPage.tsx** - Historial de pedidos del cliente
   - Listar pedidos con estado y total
   - Mostrar fecha de creación
   - Enlace a detalles del pedido

8. **AccessDeniedPage.tsx** - Página de acceso denegado
   - Mensaje amigable cuando se intenta acceder a sección sin permisos

### Frontend - Actualizaciones

1. **App.tsx** - Rutas protegidas por rol
   ```
   - /login: Login (sin protección)
   - /home: AdminDashboard si isAdmin, ClienteDashboard si isCliente
   - /categorias, /ingredientes, /ventas: Requiere ADMIN
   - /productos, /productos/:id: Acceso para ambos roles
   - /carrito, /mis-pedidos: Requiere CLIENTE
   - /access-denied: Para accesos rechazados
   ```

2. **AuthContext.tsx** - Propiedades computadas para roles
   - `isAdmin` = roles.includes("ADMIN")
   - `isCliente` = roles.includes("CLIENTE")
   - Persiste roles en localStorage

3. **services/api.ts** - LoginResponse incluye roles

### Backend - Actualizaciones

1. **schemas.py** - TokenResponse actualizado
   - Nuevo campo: `roles: List[str]` (códigos de rol)

2. **auth_service.py** - Login devuelve roles
   - Extract roles del usuario
   - Incluir en TokenResponse

## Cómo Ejecutar

### 1. Inicia Docker con PostgreSQL
```bash
docker-compose up -d
```

### 2. Inicia el backend FastAPI
```bash
cd C:\Programación\Programacion4\ProyectoFinal\INTEGRADOR_FOOD_STORE
python main.py
```
El backend estará en `http://localhost:8000`

### 3. Inicia el frontend React
```bash
cd frontend
npm run dev
```
El frontend estará en `http://localhost:5173`

## Verificar Implementación

### Test 1: Login ADMIN
1. Ir a `http://localhost:5173/login`
2. Usar credenciales: `admin@test.com` / `contraseña123`
3. Verifica que:
   - ✅ Se almacenan roles en localStorage
   - ✅ Se redirige a AdminDashboard
   - ✅ NavBar muestra opciones ADMIN
   - ✅ Acceso a `/categorias`, `/ingredientes`, `/ventas`

### Test 2: Login CLIENTE
1. Ir a `http://localhost:5173/login`
2. Usar credenciales: `cliente@test.com` / `contraseña123`
3. Verifica que:
   - ✅ Se almacenan roles en localStorage
   - ✅ Se redirige a ClienteDashboard
   - ✅ NavBar muestra opciones CLIENTE
   - ✅ Acceso a `/carrito`, `/mis-pedidos`
   - ❌ Acceso denegado a `/categorias`, `/ventas`

### Test 3: Acceso Denegado
1. Log in como CLIENTE
2. Intenta acceder directamente a `http://localhost:5173/categorias`
3. Verifica que:
   - ✅ Se redirige a `/access-denied`
   - ✅ Muestra mensaje "Acceso Denegado"

### Test 4: Carrito (CLIENTE)
1. Log in como CLIENTE
2. Ir a `/productos`
3. Agregar productos al carrito
4. Ir a `/carrito`
5. Verifica que:
   - ✅ Mostrar productos con controles de cantidad
   - ✅ Calcular total correctamente
   - ✅ Botón "Seguir Comprando" devuelve a productos
   - ✅ Botón "Ir a Checkout" (placeholder por ahora)

### Test 5: Logout
1. Click en botón de logout en NavBar
2. Verifica que:
   - ✅ Se limpia localStorage
   - ✅ Se redirige a `/login`

## Estructura de Carpetas Actualizada

```
frontend/src/
├── components/
│   ├── Modal.tsx
│   ├── NavBar.tsx (NUEVO)
│   └── ProtectedRoute.tsx (NUEVO)
├── context/
│   ├── AuthContext.tsx (ACTUALIZADO)
│   └── CartContext.tsx (NUEVO)
├── pages/
│   ├── EntityPages.tsx
│   ├── CategoryDetailPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── IngredientDetailPage.tsx
│   ├── VentasPage.tsx
│   ├── LoginPage.tsx
│   ├── AdminDashboard.tsx (NUEVO)
│   ├── ClienteDashboard.tsx (NUEVO)
│   ├── CarritoPage.tsx (NUEVO)
│   ├── MisPedidosPage.tsx (NUEVO)
│   └── AccessDeniedPage.tsx (NUEVO)
├── services/
│   └── api.ts (ACTUALIZADO)
└── App.tsx (ACTUALIZADO)
```

## Detalles Técnicos

### Storage en localStorage
```javascript
{
  "food_store_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "food_store_user": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "admin@test.com",
    "celular": "1234567890",
    "activo": true
  },
  "food_store_roles": ["ADMIN"]
}
```

### Flow de Autenticación
1. Usuario ingresa credenciales (email + password)
2. Backend devuelve: `{ access_token, token_type, usuario, roles }`
3. Frontend:
   - Guarda token en localStorage
   - Guarda usuario en localStorage
   - Guarda roles en localStorage
   - Renderiza NavBar y dashboard según rol

### Protección de Rutas
1. ProtectedRoute valida token (redirige a /login si no existe)
2. Si requiredRoles definido, valida que usuario tenga al menos un rol
3. Si roles no coinciden, redirige a /access-denied