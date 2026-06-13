import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  cambiarEstadoPedido,
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

function puedeCancelar(estado: string): boolean {
  return ["PENDIENTE", "CONFIRMADO", "PAGADO"].includes(estado);
}

export function OperacionesPedidosPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOperate = hasRole("ADMIN") || hasRole("PEDIDOS");

  const cargarPedidos = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await listPedidos(0, 100);
      setPedidos(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPedidos();
    const ws = new WebSocket(getPedidosWebSocketUrl());
    ws.onmessage = () => cargarPedidos();
    return () => ws.close();
  }, [cargarPedidos]);

  const avanzarEstado = async (pedido: PedidoPublic, nuevoEstado: string): Promise<void> => {
    try {
      await cambiarEstadoPedido(pedido.id, nuevoEstado);
      await cargarPedidos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  };

  const cancelarPedido = async (pedido: PedidoPublic): Promise<void> => {
    try {
      await cambiarEstadoPedido(pedido.id, "CANCELADO", "Cancelado por administrador");
      await cargarPedidos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el pedido");
    }
  };

  const siguienteEstado = (estado: string): string | null => {
    const flujo: Record<string, string | null> = {
      PENDIENTE: "CONFIRMADO",
      CONFIRMADO: "EN_PREP",
      PAGADO: "EN_PREP",
      EN_PREP: "EN_CAMINO",
      EN_CAMINO: "ENTREGADO",
      ENTREGADO: null,
      CANCELADO: null,
    };
    return flujo[estado] ?? null;
  };

  const stats = useMemo(() => {
    const pendientes = pedidos.filter((p) => p.estado_codigo === "PENDIENTE" || p.estado_codigo === "CONFIRMADO");
    const activos = pedidos.filter((p) => p.estado_codigo === "EN_PREP" || p.estado_codigo === "EN_CAMINO");
    return { pendientes: pendientes.length, activos: activos.length };
  }, [pedidos]);

  if (loading && pedidos.length === 0) {
    return <p className="text-slate-700">Cargando pedidos...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5">
        <h1 className="text-3xl font-semibold text-orange-950">Operaciones de Pedidos</h1>
        <p className="mt-2 text-sm text-slate-600">
          {pedidos.length} pedidos &middot; {stats.pendientes} pendientes/confirmados &middot; {stats.activos} en preparación/camino
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-orange-100">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead className="bg-orange-100 text-left text-orange-900">
            <tr>
              <th className="border px-3 py-2">#</th>
              <th className="border px-3 py-2">Cliente</th>
              <th className="border px-3 py-2">Estado</th>
              <th className="border px-3 py-2">Fecha</th>
              <th className="border px-3 py-2">Total</th>
              <th className="border px-3 py-2">Detalle</th>
              {canOperate ? <th className="border px-3 py-2">Operación</th> : null}
            </tr>
          </thead>
          <tbody>
            {pedidos.length > 0 ? (
              pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td className="border px-3 py-2 text-slate-700">#{pedido.id}</td>
                  <td className="border px-3 py-2 text-slate-700">{pedido.usuario_id}</td>
                  <td className={`border px-3 py-2 font-medium ${estadoColor[pedido.estado_codigo] ?? "text-slate-700"}`}>
                    {pedido.estado_codigo}
                  </td>
                  <td className="border px-3 py-2 text-slate-700">
                    {pedido.created_at ? new Date(pedido.created_at).toLocaleString("es-AR") : "-"}
                  </td>
                  <td className="border px-3 py-2 font-medium text-orange-900">${asNumber(pedido.total).toFixed(2)}</td>
                  <td className="border px-3 py-2">
                    <Link
                      to={`/operaciones-pedidos/${pedido.id}`}
                      className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
                    >
                      Ver
                    </Link>
                  </td>
                  {canOperate ? (
                    <td className="border px-3 py-2">
                      <div className="flex gap-1">
                        {siguienteEstado(pedido.estado_codigo) ? (
                          <button
                            type="button"
                            onClick={() => avanzarEstado(pedido, siguienteEstado(pedido.estado_codigo) as string)}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            {siguienteEstado(pedido.estado_codigo)}
                          </button>
                        ) : null}
                        {puedeCancelar(pedido.estado_codigo) ? (
                          <button
                            type="button"
                            onClick={() => cancelarPedido(pedido)}
                            className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            Cancelar
                          </button>
                        ) : null}
                        {!siguienteEstado(pedido.estado_codigo) && !puedeCancelar(pedido.estado_codigo) ? (
                          <span className="text-xs text-slate-500">Terminal</span>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td className="border px-3 py-3 text-slate-600" colSpan={canOperate ? 7 : 6}>
                  No hay pedidos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
