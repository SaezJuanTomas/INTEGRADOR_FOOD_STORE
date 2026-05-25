import { useEffect, useMemo, useState } from "react";
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

export function VentasPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOperate = hasRole("ADMIN") || hasRole("PEDIDOS");

  useEffect(() => {
    const cargarVentas = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await listPedidos(0, 100);
        setPedidos(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando ventas");
      } finally {
        setLoading(false);
      }
    };

    cargarVentas();

    const ws = new WebSocket(getPedidosWebSocketUrl());
    ws.onmessage = () => {
      cargarVentas();
    };

    return () => {
      ws.close();
    };
  }, []);

  const avanzarEstado = async (pedido: PedidoPublic, nuevoEstado: string): Promise<void> => {
    try {
      await cambiarEstadoPedido(pedido.id, nuevoEstado);
      const data = await listPedidos(0, 100);
      setPedidos(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  };

  const siguienteEstado = (estado: string): string | null => {
    const flujo: Record<string, string | null> = {
      PENDIENTE: "CONFIRMADO",
      CONFIRMADO: "EN_PREP",
      EN_PREP: "EN_CAMINO",
      EN_CAMINO: "ENTREGADO",
      ENTREGADO: null,
      CANCELADO: null,
    };
    return flujo[estado] ?? null;
  };

  const totalVentas = useMemo(
    () => pedidos.reduce((acc, pedido) => acc + asNumber(pedido.total), 0),
    [pedidos]
  );

  const pedidosConfirmados = useMemo(
    () => pedidos.filter((pedido) => pedido.estado_codigo !== "CANCELADO").length,
    [pedidos]
  );

  const promedioTicket = pedidosConfirmados > 0 ? totalVentas / pedidosConfirmados : 0;

  if (loading) {
    return <p className="text-slate-700">Cargando ventas...</p>;
  }

  if (error) {
    return <p className="text-red-600">No se pudieron cargar las ventas: {error}</p>;
  }

  return (
    <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">Reporte actualizado</p>
        <h1 className="text-3xl font-semibold text-orange-950">Ventas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Listado de pedidos realizados y resumen de ventas del sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Total ventas</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">${totalVentas.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-600">Suma de pedidos listados.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Pedidos</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">{pedidos.length}</p>
          <p className="mt-1 text-sm text-slate-600">Incluye confirmados, pendientes y cancelados.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Ticket promedio</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">${promedioTicket.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-600">Promedio de pedidos no cancelados.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-orange-950">Listado de ventas</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-orange-100">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-orange-100 text-left text-orange-900">
              <tr>
                <th className="border px-3 py-2">Pedido</th>
                <th className="border px-3 py-2">Usuario</th>
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
                    <td className="border px-3 py-2 text-slate-700">{pedido.estado_codigo}</td>
                    <td className="border px-3 py-2 text-slate-700">
                      {pedido.created_at ? new Date(pedido.created_at).toLocaleString("es-AR") : "-"}
                    </td>
                    <td className="border px-3 py-2 font-medium text-orange-900">${asNumber(pedido.total).toFixed(2)}</td>
                    <td className="border px-3 py-2">
                      <Link
                        to={hasRole("ADMIN") ? `/ventas/${pedido.id}` : `/operaciones-pedidos/${pedido.id}`}
                        className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
                      >
                        Ver detalle
                      </Link>
                    </td>
                    {canOperate ? (
                      <td className="border px-3 py-2">
                        {siguienteEstado(pedido.estado_codigo) ? (
                          <button
                            type="button"
                            onClick={() => avanzarEstado(pedido, siguienteEstado(pedido.estado_codigo) as string)}
                            className="rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-600"
                          >
                            Pasar a {siguienteEstado(pedido.estado_codigo)}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Sin transición</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-3 py-3 text-slate-600" colSpan={canOperate ? 7 : 6}>
                    Aún no hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
