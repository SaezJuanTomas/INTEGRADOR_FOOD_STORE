export function VentasPage(): JSX.Element {
  return (
    <section className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-700">Próxima entrega</p>
        <h1 className="text-3xl font-semibold text-orange-950">Ventas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Esta vista deja preparada la estructura visual para carrito, checkout y estadísticas de ventas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Ticket actual</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">$0.00</p>
          <p className="mt-1 text-sm text-slate-600">Sin productos cargados aún.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Ítems</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">0</p>
          <p className="mt-1 text-sm text-slate-600">Se completará con carrito en la siguiente fase.</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Estado</p>
          <p className="mt-2 text-2xl font-semibold text-orange-950">Base lista</p>
          <p className="mt-1 text-sm text-slate-600">Estructura y navegación preparadas.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-orange-950">Listado de venta (mock)</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-orange-100">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-orange-100 text-left text-orange-900">
              <tr>
                <th className="border px-3 py-2">Producto</th>
                <th className="border px-3 py-2">Cantidad</th>
                <th className="border px-3 py-2">Precio</th>
                <th className="border px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-3 py-3 text-slate-600" colSpan={4}>
                  Aún no hay items en venta.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
