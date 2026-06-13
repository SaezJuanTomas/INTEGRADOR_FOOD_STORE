# Proyecto Integrador Food Store — Resumen

## Goal
Sistema de venta de comida con pedidos online, integración MercadoPago y autenticación JWT.

## Constraints & Preferences
- Producción MP APP_USR funciona con `sandbox_init_point` para sandbox
- Pago hereda de BaseModel (soft-delete)
- Cobertura mínima 60%
- TP exige FSM sin PAGADO, endpoint `/api/v1/pagos/crear`, refresh token, rate limiting, uploads, estadísticas, websockets

## Progreso

### ✅ Completado
- **SQLite fallback:** `app/core/config.py` con `ENVIRONMENT=development` usa `sqlite:///./food_store.db`; `database.py` pasa `connect_args={"check_same_thread": False}`.
- **Seed usuarios:** `main.py` crea `admin@test.com` (admin123) y `cliente@test.com` (cliente123).
- **Seed datos:** Categorías (Pizzas, Bebidas, Adicionales), productos (Muzza $1500, Napolitana $1800, Fainá $500, Coca 1.5L $1200, Agua $400) e ingredientes.
- **Frontend login:** `LoginPage.tsx` contraseña default `admin123`, removido demo user.
- **Frontend blank screen:** `api.ts` con `export const api`; `tsconfig.json` con `"types": ["vite/client"]`.
- **MP sandbox checkout:** `service.py` sin `auto_return`, usa `sandbox_init_point`.
- **Endpoint GET /api/v1/pagos/{pedido_id}:** `router.py` + `PagoPublic` en `schemas.py`.
- **Payment info en PedidoDetail:** Campos `pago_estado`, `pago_mp_status`, `pago_mp_payment_id` en schema y service.
- **VentasPage frontend:** Columna "Pago" con estado, botón "Cancelar" para PENDIENTE/CONFIRMADO/PAGADO, cards de resumen (total ventas, pedidos, ticket promedio).
- **VentaDetailPage frontend:** Card de pago MP con estado, MP status, detail, payment ID, preference ID, monto.
- **Tests:** 25 tests pasan con 64% cobertura.

### 🔄 En Progreso
- (ninguno)

### ❌ Bloqueado
- (ninguno)

## Decisiones clave
- `sandbox_init_point` para checkout sandbox con token APP_USR
- Payment info en `PedidoDetail` para evitar llamadas extra en vistas de lista
- Vite proxy quita prefijo `/api`; frontend llama a `/api/v1/...`
- Sin Alembic — cambios de esquema requieren SQL manual

## Siguientes pasos (TP alignment)
1. Ajustar FSM: remover PAGADO (PENDIENTE→CONFIRMADO→EN_PREP→EN_CAMINO→ENTREGADO/CANCELADO)
2. Endpoint `/api/v1/pagos/crear` en lugar de crear preference desde pedido
3. Refresh token
4. Rate limiting
5. Uploads (imágenes)
6. Estadísticas
7. WebSocket existente verificar cobertura TP

## Archivos relevantes
- `app/core/config.py` — SQLite fallback
- `app/core/database.py` — connect_args SQLite
- `main.py` — seed usuarios, categorías, productos
- `app/modules/payments/` — router, schemas, service
- `app/modules/pedidos/schemas.py` — PedidoDetail con pago
- `app/modules/pedidos/service.py` — _to_detail() con pago
- `frontend/src/pages/VentasPage.tsx` — tabla con pago y cancelar
- `frontend/src/pages/VentaDetailPage.tsx` — card de pago MP
- `frontend/src/services/api.ts` — PagoPublic, getPagoByPedido
- `.env` — APP_USR token, VITE_FRONTEND_URL
- `frontend/tsconfig.json` — tipos vite/client
