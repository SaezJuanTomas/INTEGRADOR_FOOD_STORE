import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getPedidosWebSocketUrl,
  listPedidos,
  type PedidoPublic,
} from "../services/api";

function asNumber(value: number | string): number {
  return Number(value ?? 0);
}

const estadoColor: Record<string, string> = {
  PENDIENTE: "text-yellow-600",
  CONFIRMADO: "text-blue-600",
  PAGADO: "text-green-600",
  EN_PREP: "text-purple-600",
  EN_CAMINO: "text-cyan-600",
  ENTREGADO: "text-green-700",
  CANCELADO: "text-red-600",
};

const estadoBadgeBg: Record<string, string> = {
  PENDIENTE: "bg-yellow-500",
  CONFIRMADO: "bg-blue-500",
  PAGADO: "bg-green-500",
  EN_PREP: "bg-purple-500",
  EN_CAMINO: "bg-cyan-500",
  ENTREGADO: "bg-green-600",
  CANCELADO: "bg-red-500",
};

const ESTADOS = ["PENDIENTE", "CONFIRMADO", "PAGADO", "EN_PREP", "EN_CAMINO", "ENTREGADO", "CANCELADO"] as const;

export function VentasPage(): JSX.Element {
  const [pedidos, setPedidos] = useState<PedidoPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarVentas = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await listPedidos(0, 100);
      setPedidos(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando ventas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas();

    const ws = new WebSocket(getPedidosWebSocketUrl());
    ws.onmessage = () => cargarVentas();

    const interval = setInterval(cargarVentas, 10_000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [cargarVentas]);

  const stats = useMemo(() => {
    const porEstado: Record<string, { count: number; total: number }> = {};
    for (const e of ESTADOS) {
      porEstado[e] = { count: 0, total: 0 };
    }
    let pagadosTotal = 0;
    let pagadosCount = 0;
    for (const p of pedidos) {
      const t = asNumber(p.total);
      if (porEstado[p.estado_codigo]) {
        porEstado[p.estado_codigo].count += 1;
        porEstado[p.estado_codigo].total += t;
      }
      if (p.pago_estado === "aprobado") {
        pagadosTotal += t;
        pagadosCount += 1;
      }
    }
    const totalPedidos = pedidos.length;
    const maxCount = Math.max(...ESTADOS.map((e) => porEstado[e].count), 1);
    return { porEstado, pagadosTotal, pagadosCount, totalPedidos, maxCount };
  }, [pedidos]);

  const promedioTicket = (() => {
    return stats.pagadosCount > 0 ? stats.pagadosTotal / stats.pagadosCount : 0;
  })();

  if (loading && pedidos.length === 0) {
    return <p className="text-slate-700">Cargando ventas...</p>;
  }

  if (error) {
    return <p className="text-red-600">No se pudieron cargar las ventas: {error}</p>;
  }

  return (
    <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">Dashboard</p>
        <h1 className="text-3xl font-semibold text-orange-950">Ventas</h1>
        <p className="mt-2 text-sm text-slate-600">
          {pedidos.length} pedidos &middot; {stats.pagadosCount} pagados &middot; se actualiza cada 10s
        </p>
      </div>

      {/* Cards principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-green-700">Ingresos cobrados</p>
          <p className="mt-2 text-2xl font-semibold text-green-950">${stats.pagadosTotal.toFixed(2)}</p>
          <p className="mt-1 text-sm text-green-600">{stats.pagadosCount} pedidos pagados</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-700">Ticket promedio</p>
          <p className="mt-2 text-2xl font-semibold text-blue-950">${promedioTicket.toFixed(2)}</p>
          <p className="mt-1 text-sm text-blue-600">Por pedido pagado</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-700">En preparación / camino</p>
          <p className="mt-2 text-2xl font-semibold text-purple-950">
            {stats.porEstado["EN_PREP"].count + stats.porEstado["EN_CAMINO"].count}
          </p>
          <p className="mt-1 text-sm text-purple-600">{stats.porEstado["EN_PREP"].count} prep &middot; {stats.porEstado["EN_CAMINO"].count} camino</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-red-700">Cancelados</p>
          <p className="mt-2 text-2xl font-semibold text-red-950">{stats.porEstado["CANCELADO"].count}</p>
          <p className="mt-1 text-sm text-red-600">${stats.porEstado["CANCELADO"].total.toFixed(2)} en cancelados</p>
        </div>
      </div>

      {/* Barra de distribución de estados */}
      <div className="mt-5 rounded-2xl border border-orange-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-orange-950">Distribución de pedidos por estado</h2>
        <div className="flex h-6 overflow-hidden rounded-full bg-slate-100">
          {ESTADOS.filter((e) => stats.porEstado[e].count > 0).map((e) => {
            const pct = (stats.porEstado[e].count / Math.max(stats.totalPedidos, 1)) * 100;
            return (
              <div
                key={e}
                style={{ width: `${pct}%` }}
                className={`${estadoBadgeBg[e] ?? "bg-slate-400"} flex items-center justify-center text-[10px] font-bold text-white transition-all first:rounded-l-full last:rounded-r-full`}
                title={`${e}: ${stats.porEstado[e].count} pedidos`}
              >
                {pct > 8 ? `${Math.round(pct)}%` : null}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {ESTADOS.filter((e) => stats.porEstado[e].count > 0).map((e) => (
            <span key={e} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${estadoBadgeBg[e] ?? "bg-slate-400"}`} />
              {e}: {stats.porEstado[e].count}
            </span>
          ))}
        </div>
      </div>

      {/* Tabla de ingresos por estado */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-orange-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-orange-950">Ingresos por estado</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-100 text-left text-xs text-slate-500 uppercase">
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 text-right font-medium">Pedidos</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {ESTADOS.filter((e) => stats.porEstado[e].count > 0).map((e) => (
                <tr key={e} className="border-b border-orange-50">
                  <td className={`py-1.5 font-medium ${estadoColor[e] ?? "text-slate-700"}`}>{e}</td>
                  <td className="py-1.5 text-right text-slate-700">{stats.porEstado[e].count}</td>
                  <td className="py-1.5 text-right font-mono text-slate-800">${stats.porEstado[e].total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-semibold text-orange-900">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right">{stats.totalPedidos}</td>
                <td className="pt-2 text-right">${pedidos.reduce((a, p) => a + asNumber(p.total), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cards rápidas - últimos eventos */}
        <div className="rounded-2xl border border-orange-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-orange-950">Resumen rápido</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between rounded bg-orange-50/50 px-3 py-2">
              <dt className="text-slate-600">Tasa de conversión</dt>
              <dd className="font-semibold text-orange-900">
                {stats.totalPedidos > 0
                  ? `                  ${((stats.pagadosCount / stats.totalPedidos) * 100).toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between rounded bg-orange-50/50 px-3 py-2">
              <dt className="text-slate-600">Tasa de cancelación</dt>
              <dd className="font-semibold text-red-600">
                {stats.totalPedidos > 0
                  ? `${((stats.porEstado["CANCELADO"].count / stats.totalPedidos) * 100).toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between rounded bg-orange-50/50 px-3 py-2">
              <dt className="text-slate-600">Ingreso neto estimado</dt>
              <dd className="font-mono font-semibold text-green-700">
                ${(stats.pagadosTotal - stats.porEstado["CANCELADO"].total).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between rounded bg-orange-50/50 px-3 py-2">
              <dt className="text-slate-600">Pedido más caro (pagado)</dt>
              <dd className="font-mono font-semibold text-orange-900">
                ${Math.max(...pedidos.filter((p) => p.pago_estado === "aprobado").map((p) => asNumber(p.total)), 0).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
