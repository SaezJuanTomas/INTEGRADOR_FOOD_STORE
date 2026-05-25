export function StockDashboard(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-900">Panel de Stock</h1>
        <p className="mt-2 text-orange-700">Control de inventario y disponibilidad de productos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <a href="/stock" className="rounded-2xl border border-orange-100 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-md transition hover:shadow-lg hover:border-green-200">
          <h2 className="mb-2 text-2xl font-bold text-green-900">📦 Stock</h2>
          <p className="text-green-800">Gestioná productos e ingredientes, actualizá cantidades y disponibilidad.</p>
        </a>
        <a href="/productos" className="rounded-2xl border border-orange-100 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-md transition hover:shadow-lg hover:border-blue-200">
          <h2 className="mb-2 text-2xl font-bold text-blue-900">🛍️ Productos</h2>
          <p className="text-blue-800">Visualizá el catálogo completo de productos y sus detalles.</p>
        </a>
      </div>

      <div className="mt-8 rounded-lg border border-green-100 bg-green-50 p-6">
        <h3 className="mb-3 text-lg font-semibold text-green-900">📋 Tu rol: STOCK</h3>
        <ul className="space-y-2 text-sm text-green-800">
          <li>✓ Podés ver y editar el stock de productos e ingredientes</li>
          <li>✓ Podés cambiar la disponibilidad de productos</li>
          <li>✓ No podés crear ni eliminar productos, categorías o ingredientes</li>
          <li>✓ No podés gestionar usuarios ni roles</li>
        </ul>
      </div>
    </div>
  );
}
