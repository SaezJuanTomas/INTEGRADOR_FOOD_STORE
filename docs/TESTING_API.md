# 🧪 GUÍA DE TESTING - Food Store API

Ejemplos de cómo testear los nuevos endpoints.

---

## 1️⃣ REGISTRAR USUARIO

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "celular": "+541234567890",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "celular": "+541234567890",
  "activo": true
}
```

---

## 2️⃣ LOGIN

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "usuario": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "celular": "+541234567890",
    "activo": true
  }
}
```

**Guardar el `access_token` para los próximos requests.**

El login usa el `email` del usuario, no un nombre corto.

---

## 3️⃣ OBTENER USUARIO ACTUAL

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

---

## 4️⃣ CREAR DIRECCIÓN DE ENTREGA

```bash
curl -X POST "http://localhost:8000/usuarios/1/direcciones" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "Casa",
    "linea1": "Calle Principal 123",
    "linea2": "Apto 4B",
    "ciudad": "Buenos Aires",
    "provincia": "Buenos Aires",
    "codigo_postal": "1425",
    "es_principal": true
  }'
```

---

## 5️⃣ CREAR PEDIDO

**Primero obtener ID de productos válidos:**

```bash
curl -X GET "http://localhost:8000/productos?limit=5"
```

**Luego crear el pedido:**

```bash
curl -X POST "http://localhost:8000/pedidos" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "direccion_entrega_id": 1,
    "detalles": [
      {
        "producto_id": 1,
        "cantidad": 2
      },
      {
        "producto_id": 2,
        "cantidad": 1
      }
    ],
    "descuento": 50.00,
    "notas": "Sin picante, por favor"
  }'
```

---

## 6️⃣ LISTAR PEDIDOS

```bash
curl -X GET "http://localhost:8000/pedidos?offset=0&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

---

## 7️⃣ OBTENER DETALLE DE PEDIDO

```bash
curl -X GET "http://localhost:8000/pedidos/1" \
  -H "Authorization: Bearer <access_token>"
```

**Response** incluye detalles con snapshots:
```json
{
  "id": 1,
  "usuario_id": 1,
  "estado_codigo": "PENDIENTE",
  "subtotal": 500.00,
  "descuento": 50.00,
  "costo_envio": 0.00,
  "total": 450.00,
  "detalles": [
    {
      "id": 1,
      "producto_id": 1,
      "cantidad": 2,
      "nombre_snapshot": "Milanesa de Pollo",
      "precio_snapshot": 250.00,
      "subtotal_snapshot": 500.00
    }
  ]
}
```

---

## 8️⃣ CONFIRMAR PEDIDO

```bash
curl -X PATCH "http://localhost:8000/pedidos/1/confirmar" \
  -H "Authorization: Bearer <access_token>"
```

**Efectos:**
- Descontar stock (si aplica)
- Cambiar estado: PENDIENTE → CONFIRMADO
- Registrar en historial

---

## 9️⃣ VER HISTORIAL DE PEDIDO

```bash
curl -X GET "http://localhost:8000/pedidos/1/historial" \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "pedido_id": 1,
      "estado_desde_codigo": "PENDIENTE",
      "estado_hacia_codigo": "CONFIRMADO",
      "usuario_id": 1,
      "motivo": "Pedido confirmado por usuario",
      "fecha": "2026-05-15T14:30:00Z"
    }
  ]
}
```

---

## 🔟 CAMBIAR ESTADO PEDIDO (ADMIN)

```bash
curl -X PATCH "http://localhost:8000/pedidos/1/estado" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "estado_codigo": "PREPARANDO",
    "motivo": "Iniciando preparación"
  }'
```

**Transiciones válidas:**
- PENDIENTE → [CONFIRMADO, CANCELADO]
- CONFIRMADO → [PREPARANDO, CANCELADO]
- PREPARANDO → [EN_CAMINO]
- EN_CAMINO → [ENTREGADO]

---

## 1️⃣1️⃣ CANCELAR PEDIDO

```bash
curl -X PATCH "http://localhost:8000/pedidos/1/cancelar?motivo=Cambié+de+idea" \
  -H "Authorization: Bearer <access_token>"
```

---

## ⚙️ ASIGNAR ROL A USUARIO

```bash
curl -X POST "http://localhost:8000/usuarios/1/roles/ADMIN" \
  -H "Content-Type: application/json"
```

---

## 📝 NOTAS IMPORTANTES

1. **Token expiration**: 24 horas  
2. **Stock management**: Solo se descuenta si `producto.usa_stock_manual == True`  
3. **Snapshots**: Se crean automáticamente al crear el pedido  
4. **Direcciones**: Solo una puede ser "principal"  
5. **Email único**: No se puede registrar dos usuarios con mismo email  
6. **Soft delete**: Usuarios/direcciones/pedidos nunca se eliminan físicamente  

---

## 🐛 DEBUGGING

Ver documentación interactiva:
```
http://localhost:8000/docs
```

Ver OpenAPI schema:
```
http://localhost:8000/openapi.json
```

---

**¡Que disfrutes testing! 🚀**
