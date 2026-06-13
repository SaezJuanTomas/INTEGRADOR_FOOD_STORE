## Recent Changes

### 2026-06-13 — Split dashboard & list; fix total ventas
- **VentasPage**: removed table, now pure dashboard (stats, charts, summary cards). Auto-refresh via WS + 10s interval.
- **OperacionesPedidosPage**: new page with full order table (estado, total, cliente) + action buttons (avanzar estado, cancelar). Connected to WebSocket for live updates.
- **App.tsx**: `/operaciones-pedidos` → `OperacionesPedidosPage`; removed duplicate `VentasPage` import.
- **Backend `PedidoPublic` schema**: added `pago_estado` + `pago_mp_status` fields.
- **Backend `PedidoService._to_public()`**: now queries `PagoRepository` to populate payment fields (was `_to_detail` only).
- **Frontend `PedidoPublic` type**: extended with `forma_pago_codigo`, `pago_estado`, `pago_mp_status`.
- **Dashboard stats**: payment detection changed from `estado_codigo === "PAGADO"` to `pago_estado === "aprobado"` — fixes total ventas = 0 when paid orders have been advanced past PAGADO state.
