## Recent Changes

### 2026-06-13 — Search/filter, MP ID on detail, refresh token, rate limiting, estadísticas, new model fields, tests fixed
- **MisPedidosPage**: text input to search by order ID + select to filter by estado.
- **ProductosClientePage**: text input to search by name, select to filter by categoría (fetched from API), checkbox "Solo disponibles".
- **ClientePedidoDetailPage**: shows `mp_payment_id` (MercadoPago payment ID) and `mp_status` badge in payment section.
- **Refresh Token**: `create_refresh_token()`, `decode_refresh_token()` in `security.py`; `REFRESH_TOKEN_EXPIRE_DAYS=7` in config; `POST /auth/refresh` endpoint; `refresh_token` in `TokenResponse`; `AuthService.refresh()` method.
- **Rate Limiting**: `app/core/rate_limit/` package with TokenBucket algorithm + `RateLimitMiddleware` (5 auth/min, 60 default/min); registered in `main.py`. Skipped in tests via `SKIP_RATE_LIMIT=1`.
- **Estadísticas module**: `app/modules/estadisticas/` with schemas, `EstadisticasService` (5 methods), and router (5 endpoints: `/resumen`, `/ventas`, `/productos-top`, `/pedidos-por-estado`, `/ingresos`). Registered at `/api/v1/estadisticas`.
- **Formas de pago seed**: `TARJETA` → `MERCADOPAGO` (now: `MERCADOPAGO`, `EFECTIVO`, `TRANSFERENCIA`).
- **Endpoint alias**: `POST /api/v1/pagos/crear` added alongside `/create-preference`.
- **Model fields added**:
  - `DetallePedido.personalizacion` (Optional[str])
  - `UsuarioRol.asignado_por_id` (Optional[int], FK usuarios.id) + `expires_at` (Optional[datetime])
  - `Categoria.imagen_url` (Optional[str])
  - `Producto.stock_cantidad` (Optional[int]) + `unidad_venta_id` (Optional[int], FK unidades_medida.id)
- **UsuarioRol FK ambiguity fixed**: `sa_relationship_kwargs={"foreign_keys": "UsuarioRol.usuario_id"}` on both `UsuarioRole.usuario` and `Usuario.usuarios_roles` relationships.
- **Tests**: all 25 passing. Added `SKIP_RATE_LIMIT=1` env var in conftest to bypass rate limiter during tests.

### 2026-06-13 — Split dashboard & list; fix total ventas
- **VentasPage**: removed table, now pure dashboard (stats, charts, summary cards). Auto-refresh via WS + 10s interval.
- **OperacionesPedidosPage**: new page with full order table (estado, total, cliente) + action buttons (avanzar estado, cancelar). Connected to WebSocket for live updates.
- **App.tsx**: `/operaciones-pedidos` → `OperacionesPedidosPage`; removed duplicate `VentasPage` import.
- **Backend `PedidoPublic` schema**: added `pago_estado` + `pago_mp_status` fields.
- **Backend `PedidoService._to_public()`**: now queries `PagoRepository` to populate payment fields (was `_to_detail` only).
- **Frontend `PedidoPublic` type**: extended with `forma_pago_codigo`, `pago_estado`, `pago_mp_status`.
- **Dashboard stats**: payment detection changed from `estado_codigo === "PAGADO"` to `pago_estado === "aprobado"` — fixes total ventas = 0 when paid orders have been advanced past PAGADO state.
