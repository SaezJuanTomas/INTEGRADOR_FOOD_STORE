/**
 * Página del carrito de compras.
 *
 * --- FLUJO ---
 * 1. Muestra los items del carrito (desde Zustand store)
 * 2. Permite modificar cantidades o eliminar items
 * 3. Muestra el total
 * 4. Botón "Ir a Pagar":
 *    a. POST /api/orders con los items del carrito
 *    b. El backend crea un Pedido con estado "pendiente"
 *    c. Redirige a /payment/{orderId}
 *    d. Vacía el carrito
 *
 * --- ESTADOS ---
 * - Carrito vacío: Muestra mensaje con link al catálogo
 * - Carrito con items: Muestra lista + resumen + botón de pago
 * - Error al crear pedido: Muestra mensaje de error
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useCartStore } from '../stores/cartStore'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartStore()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crea el pedido en el backend y redirige a la página de pago.
   *
   * --- POR QUÉ SE CREA EL PEDIDO ANTES DEL PAGO ---
   * El pedido debe existir en la BD antes de crear la preferencia en MP
   * porque la preferencia reference al pedido_id.
   *
   * El pedido se crea con estado "pendiente".
   * El pago se procesa después en PaymentPage.
   */
  const handleCheckout = async () => {
    setCreating(true)
    setError(null)

    try {
      const payload = {
        items: items.map((item) => ({
          producto_id: item.productoId,
          nombre_snapshot: item.nombre,
          precio_snapshot: item.precio,
          cantidad: item.cantidad,
        })),
      }

      const res = await api.post('/pedidos', payload)

      // Vaciar carrito (el pedido ya se creó en backend)
      clearCart()

      // Ir a la página de pago
      navigate(`/payment/${res.data.id}`)
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Error al crear pedido'
      setError(detail)
    } finally {
      setCreating(false)
    }
  }

  // --- VISTA: CARRTIO VACÍO ---
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="text-gray-400 mb-6">
          <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h1>
        <p className="text-gray-500 mb-6">Agregá productos desde el catálogo</p>
        <Link to="/" className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
          Ver Catálogo
        </Link>
      </div>
    )
  }

  // --- VISTA: CARRITO CON ITEMS ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">&larr; Volver al catálogo</Link>
          <h1 className="text-xl font-bold text-gray-900">Carrito</h1>
          <button
            onClick={() => { if (confirm('¿Vaciar carrito?')) clearCart() }}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Vaciar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Lista de items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productoId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex gap-4">
                {/* Imagen del producto */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Nombre y botón eliminar */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
                    <button onClick={() => removeItem(item.productoId)} className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Control de cantidad y precio */}
                  <div className="flex items-center justify-between mt-3">
                    {/* Botones + y - */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productoId, item.cantidad - 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-8 text-center font-medium">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.productoId, item.cantidad + 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Precio total del item */}
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${(item.precio * item.cantidad).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">${item.precio.toFixed(2)} c/u</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen del carrito */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">Subtotal ({totalItems()} items)</span>
            <span className="font-semibold">${totalPrice().toFixed(2)}</span>
          </div>
          <hr className="my-3" />
          <div className="flex items-center justify-between text-lg">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-blue-600">${totalPrice().toFixed(2)}</span>
          </div>

          {/* Error al crear pedido */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Botón "Ir a Pagar": crea el pedido y va a PaymentPage */}
          <button
            onClick={handleCheckout}
            disabled={creating}
            className="w-full bg-blue-500 text-white mt-4 px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creando Pedido...' : 'Ir a Pagar'}
          </button>
        </div>
      </main>
    </div>
  )
}
