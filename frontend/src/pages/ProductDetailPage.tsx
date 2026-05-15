import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { categoriaService, ingredienteService, productoService } from "../services/api";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProductDetailPage(): JSX.Element {
  const params = useParams();
  const productoId = Number(params.productoId);

  const productoQuery = useQuery({
    queryKey: ["productos", productoId],
    queryFn: () => productoService.getById(productoId),
    enabled: Number.isFinite(productoId),
  });

  const ingredientesQuery = useQuery({
    queryKey: ["ingredientes", "detail"],
    queryFn: () => ingredienteService.getAll(0, 100, false),
  });

  const categoriasQuery = useQuery({
    queryKey: ["categorias", "detail"],
    queryFn: () => categoriaService.getAll(0, 100, false),
  });

  const ingredienteMap = useMemo(() => {
    return new Map((ingredientesQuery.data?.data ?? []).map((ingrediente) => [ingrediente.id, ingrediente]));
  }, [ingredientesQuery.data]);

  const categoriaMap = useMemo(() => {
    return new Map((categoriasQuery.data?.data ?? []).map((categoria) => [categoria.id, categoria.nombre]));
  }, [categoriasQuery.data]);

  const producto = productoQuery.data;
  const categoriaNombre = producto?.categoria_nombre ?? (producto?.categoria_id ? categoriaMap.get(producto.categoria_id) : null);
  const cantidadIngredientes = producto?.ingredientes.length ?? 0;
  const margenBase = producto ? producto.margen_estimado : 0;

  return (
    <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">Detalle de producto</p>
          <h1 className="text-3xl font-semibold text-orange-950">{producto?.nombre ?? "Producto"}</h1>
        </div>
        <Link
          to="/productos"
          className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900"
        >
          Volver a productos
        </Link>
      </div>

      {productoQuery.isLoading ? <p className="text-sm text-orange-800">Cargando detalle...</p> : null}
      {productoQuery.isError ? (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
          No se pudo cargar el producto.
        </p>
      ) : null}

      {producto ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-orange-900">
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                  {producto.activo ? "Activo" : "Inactivo"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                  {producto.disponible ? "Disponible" : "No disponible"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                  {producto.usa_stock_manual ? "Stock manual" : "Stock derivado"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-sm">
                  {cantidadIngredientes > 0 ? `${cantidadIngredientes} ingredientes` : "Sin ingredientes"}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600">{producto.descripcion || "Sin descripción"}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Precio base" value={formatMoney(producto.precio_base)} />
              <MetricCard label="Costo ingredientes" value={formatMoney(producto.costo_total_ingredientes)} />
              <MetricCard label="Precio sugerido" value={formatMoney(producto.precio_sugerido)} />
              <MetricCard label="Margen estimado" value={formatMoney(margenBase)} />
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white p-4">
              <h2 className="text-lg font-semibold text-orange-950">Ingredientes</h2>
              {producto.ingredientes.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-orange-100">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-orange-100 text-left text-orange-900">
                      <tr>
                        <th className="border px-3 py-2">Ingrediente</th>
                        <th className="border px-3 py-2">Cantidad</th>
                        <th className="border px-3 py-2">Unidad</th>
                        <th className="border px-3 py-2">Opcional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {producto.ingredientes.map((ingrediente) => {
                        const ingredienteNombre = ingredienteMap.get(ingrediente.ingrediente_id)?.nombre ?? `#${ingrediente.ingrediente_id}`;
                        return (
                          <tr key={ingrediente.ingrediente_id} className="bg-white">
                            <td className="border px-3 py-2">{ingredienteNombre}</td>
                            <td className="border px-3 py-2">{formatQuantity(ingrediente.cantidad)}</td>
                            <td className="border px-3 py-2">{ingrediente.unidad}</td>
                            <td className="border px-3 py-2">{ingrediente.es_opcional ? "Sí" : "No"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Este producto no usa ingredientes.</p>
              )}
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-4">
            <h2 className="text-lg font-semibold text-orange-950">Resumen</h2>
            <SummaryLine label="Categoría" value={categoriaNombre ?? "Sin categoría"} />
            <SummaryLine label="Modo stock" value={producto.usa_stock_manual ? "Manual" : "Derivado"} />
            <SummaryLine label="Stock manual" value={producto.stock_manual !== null ? String(producto.stock_manual) : "No definido"} />
            <SummaryLine label="Stock calculado" value={producto.stock_disponible !== null ? String(producto.stock_disponible) : "No definido"} />
            <SummaryLine label="Costo compra manual" value={producto.costo_compra_manual !== null ? formatMoney(producto.costo_compra_manual) : "No definido"} />
            <SummaryLine label="Tiempo preparación" value={producto.tiempo_prep_min !== null ? `${producto.tiempo_prep_min} min` : "No definido"} />
            <SummaryLine label="Estado" value={producto.activo ? "Activo" : "Inactivo"} />
            <SummaryLine label="Disponibilidad" value={producto.disponible ? "Disponible" : "No disponible"} />
            <SummaryLine label="Precio sugerido" value={formatMoney(producto.precio_sugerido)} />
            <SummaryLine label="Costo total" value={formatMoney(producto.costo_total_ingredientes)} />
            <SummaryLine label="Margen estimado" value={formatMoney(producto.margen_estimado)} />
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-700">{label}</p>
      <p className="mt-2 text-xl font-semibold text-orange-950">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-orange-100 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-orange-700">{label}</p>
      <p className="mt-1 text-sm font-medium text-orange-950">{value}</p>
    </div>
  );
}
