export function HomePage(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-900">Food Store</h1>
        <p className="mt-2 text-orange-700">Gestión de productos, categorías e ingredientes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <a
          href="/categorias"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-md transition hover:shadow-lg hover:border-orange-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-orange-900">📂 Categorias</h2>
          <p className="text-orange-800">Administra las categorías de productos. Crea, edita y elimina categorías con orden de visualización.</p>
        </a>

        <a
          href="/productos"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-md transition hover:shadow-lg hover:border-orange-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-orange-900">🛍️ Productos</h2>
          <p className="text-orange-800">Gestiona los productos. Define precios, disponibilidad, tiempo de preparación e ingredientes.</p>
        </a>

        <a
          href="/ingredientes"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-md transition hover:shadow-lg hover:border-orange-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-orange-900">🧂 Ingredientes</h2>
          <p className="text-orange-800">Administra ingredientes y marca cuáles son alérgenos para garantizar la seguridad del cliente.</p>
        </a>

        <a
          href="/ventas"
          className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-md transition hover:shadow-lg hover:border-orange-200"
        >
          <h2 className="mb-2 text-2xl font-bold text-orange-900">💰 Ventas</h2>
          <p className="text-orange-800">Vista base para preparar carrito, checkout y métricas de venta en próximas entregas.</p>
        </a>
      </div>
    </div>
  );
}
