import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { getPedidoDetail, getHistorialPedido } from "../services/api";
import type { HistorialEstadoPedidoPublic } from "../services/api";

const stateLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREP: "Preparando",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const stateColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  EN_PREP: "bg-purple-100 text-purple-800",
  EN_CAMINO: "bg-cyan-100 text-cyan-800",
  ENTREGADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

export function VentaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const ventaId = Number(id);

  const ventaQuery = useQuery({
    queryKey: ["venta", ventaId],
    queryFn: () => getPedidoDetail(ventaId),
    enabled: !Number.isNaN(ventaId),
  });

  const historialQuery = useQuery({
    queryKey: ["venta-historial", ventaId],
    queryFn: () => getHistorialPedido(ventaId),
    enabled: !Number.isNaN(ventaId),
  });

  if (Number.isNaN(ventaId)) {
    return <p className="text-red-600">ID de venta inválido.</p>;
  }

  if (ventaQuery.isLoading) return <p className="text-slate-600">Cargando venta...</p>;
  if (ventaQuery.isError || !ventaQuery.data) {
    return <p className="text-red-600">Error al cargar la venta.</p>;
  }

  const venta = ventaQuery.data;
  const historial = historialQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/ventas" className="text-sm text-orange-600 hover:underline">&larr; Volver a ventas</Link>
          <h1 className="mt-1 text-3xl font-bold text-orange-900">Venta #{venta.id}</h1>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${stateColors[venta.estado_codigo] ?? "bg-slate-100 text-slate-800"}`}>
          {stateLabels[venta.estado_codigo] ?? venta.estado_codigo}
        </span>
      </div>

      {/* Info + Totales */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-orange-900">Información</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Cliente ID</dt><dd className="font-mono text-slate-800">{venta.usuario_id}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Fecha</dt><dd className="text-slate-800">{new Date(venta.created_at).toLocaleString("es-AR")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Forma de pago</dt><dd className="text-slate-800">{venta.forma_pago_codigo ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Notas</dt><dd className="text-slate-800">{venta.notas ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-orange-900">Totales</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="font-mono text-slate-800">${Number(venta.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Descuento</dt><dd className="font-mono text-slate-800">-${Number(venta.descuento).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Envío</dt><dd className="font-mono text-slate-800">${Number(venta.costo_envio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</dd></div>
            <div className="border-t border-orange-100 pt-2 flex justify-between"><dt className="font-semibold text-orange-900">Total</dt><dd className="font-mono font-bold text-orange-900">${Number(venta.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</dd></div>
          </dl>
        </div>
      </div>

      {/* Productos vendidos */}
      <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-orange-900">Productos vendidos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orange-100">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Producto</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Cant.</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Precio unit.</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles.map((d) => (
              <tr key={d.id} className="border-b border-orange-50 hover:bg-orange-50/50">
                <td className="px-3 py-2 font-medium text-slate-800">{d.nombre_snapshot}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{d.cantidad}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">${Number(d.precio_snapshot).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">${Number(d.subtotal_snapshot).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-orange-900">Historial de estados</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">Sin cambios registrados.</p>
        ) : (
          <div className="space-y-3">
            {[...historial].reverse().map((h: HistorialEstadoPedidoPublic) => (
              <div key={h.id} className="flex items-start gap-3 rounded-lg border border-orange-50 bg-orange-50/50 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${stateColors[h.estado_desde_codigo] ?? "bg-slate-100"}`}>
                      {stateLabels[h.estado_desde_codigo] ?? h.estado_desde_codigo}
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${stateColors[h.estado_hacia_codigo] ?? "bg-slate-100"}`}>
                      {stateLabels[h.estado_hacia_codigo] ?? h.estado_hacia_codigo}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(h.fecha).toLocaleString("es-AR")}
                    {h.motivo ? ` — ${h.motivo}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
