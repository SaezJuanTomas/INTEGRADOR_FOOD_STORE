import { useEffect, useState } from "react";
import { getPedidosWebSocketUrl, listPedidos, type PedidoPublic } from "../services/api";

export function MisPedidosPage(): JSX.Element {
  const [pedidos, setPedidos] = useState<PedidoPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarPedidos = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await listPedidos(0, 50);
        setPedidos(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    cargarPedidos();

    const ws = new WebSocket(getPedidosWebSocketUrl());
    ws.onmessage = () => {
      cargarPedidos();
    };

    return () => {
      ws.close();
    };
  }, []);

  const getEstadoColor = (estado: string): string => {
    const colores: Record<string, string> = {
      PENDIENTE: "bg-yellow-100 text-yellow-800",
      CONFIRMADO: "bg-blue-100 text-blue-800",
      EN_PREP: "bg-purple-100 text-purple-800",
      EN_CAMINO: "bg-orange-100 text-orange-800",
      ENTREGADO: "bg-green-100 text-green-800",
      CANCELADO: "bg-red-100 text-red-800",
    };
    return colores[estado] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-orange-100 bg-white/90 p-8 text-center">
        <p className="text-orange-700">Cargando pedidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-6">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="rounded-lg border border-orange-100 bg-white/90 p-8 text-center">
        <p className="text-2xl font-bold text-orange-900">No tienes pedidos aún</p>
        <p className="mt-2 text-orange-700">Comienza a comprar desde nuestro catálogo</p>
        <a
          href="/productos"
          className="mt-4 inline-block rounded bg-orange-500 px-6 py-2 font-medium text-white hover:bg-orange-600"
        >
          Ver Productos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-orange-900">Mis Pedidos</h1>

      <div className="space-y-3">
        {pedidos.map((pedido) => (
          <article
            key={pedido.id}
            className="block rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm transition hover:shadow-md hover:border-orange-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Pedido #{pedido.id}</h3>
                <p className="text-sm text-orange-700">
                  {pedido.created_at
                    ? new Date(pedido.created_at).toLocaleDateString("es-AR")
                    : "Sin fecha"}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getEstadoColor(
                    pedido.estado_codigo
                  )}`}
                >
                  {pedido.estado_codigo}
                </span>
                <p className="mt-2 font-bold text-orange-900">${Number(pedido.total).toFixed(2)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
