/**
 * Página principal: Listado de productos del catálogo.
 *
 * --- FLUJO ---
 * 1. Al montar el componente, fetchea GET /api/products
 * 2. Muestra los productos en una grilla responsiva
 * 3. Cada producto tiene un botón "Agregar" que lo añade al carrito
 *
 * --- ESTADOS ---
 * - Loading: Muestra "Cargando productos..."
 * - Success: Muestra la grilla de productos
 * - Error: No se maneja explícitamente (console.error)
 *   En un proyecto más completo se mostraría un mensaje de error
 *
 * --- DISEÑO ---
 * Usa Tailwind CSS v4 sin componentes de UI externos.
 * Las tarjetas de producto tienen:
 * - Imagen (con fallback SVG si no hay URL)
 * - Nombre
 * - Descripción (truncada a 2 líneas con line-clamp-2)
 * - Precio
 * - Botón "Agregar"
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useCartStore } from '../stores/cartStore'

interface Producto {
  id: number
  nombre: string
  descripcion: string
  precio: number
  imagen_url: string
}

export default function ProductsPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore((s) => s.addItem)

  // Fetch productos al montar el componente
  useEffect(() => {
    api.get('/productos')
      .then((res) => setProductos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  /**
   * Agrega un producto al carrito con cantidad 1.
   * Si el producto ya está en el carrito, incrementa la cantidad.
   */
  const handleAddToCart = (p: Producto) => {
    addItem({
      productoId: p.id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: 1,
      imagen: p.imagen_url,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con link al carrito */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Simple FoodStore</h1>
          <Link
            to="/cart"
            className="relative flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Carrito
          </Link>
        </div>
      </header>

      {/* Grilla de productos */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Imagen del producto */}
              <div className="h-48 bg-gray-100 overflow-hidden">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  /* Fallback: icono SVG si no hay imagen */
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info del producto */}
              <div className="p-4">
                <h2 className="font-semibold text-gray-900">{p.nombre}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.descripcion}</p>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-gray-900">${p.precio.toFixed(2)}</span>
                  <button
                    onClick={() => handleAddToCart(p)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
