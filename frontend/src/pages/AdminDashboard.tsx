export function AdminDashboard(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-900">Panel de Administración</h1>
        <p className="mt-2 text-orange-700">Gestión completa del sistema Food Store</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <a
          href="/categorias"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-md transition hover:shadow-lg hover:border-blue-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-blue-900">📂 Categorías</h2>
          <p className="text-blue-800">Administra categorías. Crea, edita, reordena y elimina.</p>
        </a>

        <a
          href="/productos"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-md transition hover:shadow-lg hover:border-green-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-green-900">🛍️ Productos</h2>
          <p className="text-green-800">Gestiona productos, precios, ingredientes y disponibilidad.</p>
        </a>

        <a
          href="/ingredientes"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-md transition hover:shadow-lg hover:border-purple-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-purple-900">🧂 Ingredientes</h2>
          <p className="text-purple-800">Administra ingredientes, alérgenos y stocks.</p>
        </a>

        <a
          href="/ventas"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-md transition hover:shadow-lg hover:border-amber-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-amber-900">💰 Ventas</h2>
          <p className="text-amber-800">Visualiza todas las ventas, historial de cambios y detalle completo.</p>
        </a>

        <a
          href="/operaciones-pedidos"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-rose-50 to-rose-100 p-6 shadow-md transition hover:shadow-lg hover:border-rose-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-rose-900">🍳 Pedidos en vivo</h2>
          <p className="text-rose-800">Gestioná pedidos en tiempo real, cambiá estados y monitoreá órdenes.</p>
        </a>

        <a
          href="/usuarios"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-red-50 to-red-100 p-6 shadow-md transition hover:shadow-lg hover:border-red-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-red-900">👥 Usuarios</h2>
          <p className="text-red-800">Gestiona usuarios, roles y permisos del sistema.</p>
        </a>

        <a
          href="/gastos"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-md transition hover:shadow-lg hover:border-gray-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-gray-900">📊 Gastos</h2>
          <p className="text-gray-800">Seguimiento de costos, proveedores y análisis financiero.</p>
        </a>
      </div>
    </div>
  );
}
