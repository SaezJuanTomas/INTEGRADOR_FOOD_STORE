/**
 * Página de pago: muestra el resumen del pedido y el botón de MercadoPago.
 *
 * --- FLUJO ---
 * 1. Al montar, fetchea GET /api/orders/{orderId} para obtener el total
 * 2. Muestra el resumen del pedido (ID, estado, total)
 * 3. Renderiza el PaymentButton que inicia el flujo de MP
 *
 * --- POR QUÉ UNA PÁGINA SEPARADA ---
 * Podríamos haber puesto el PaymentButton directamente en CartPage.
 * Pero separar la creación del pedido (CartPage) del pago (PaymentPage)
 * tiene ventajas:
 *   - Si el usuario recarga la página de pago, el pedido ya existe
 *   - El carrito ya se vació (menos riesgo de crear dos pedidos)
 *   - La URL /payment/{id} es compartible (historial)
 *
 * --- ESTADOS ---
 * - Loading: Obteniendo datos del pedido
 * - Error: Pedido no encontrado (ID inválido)
 * - Success: Muestra resumen + botón de pago
 */
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { PaymentButton } from '../components/PaymentButton'

interface OrderData {
  id: number
  total: number
  estado: string
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch datos del pedido al montar
  useEffect(() => {
    api.get(`/pedidos/${orderId}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('No se pudo cargar el pedido'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando pedido...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h1>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
          Volver al Catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/cart" className="text-sm text-blue-600 hover:text-blue-800">&larr; Volver al carrito</Link>
          <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen del Pedido #{order.id}
          </h2>

          <div className="space-y-3">
            {/* Estado del pedido */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado</span>
              <span className="font-medium text-yellow-600">
                Pendiente de pago
              </span>
            </div>
            <hr />
            {/* Total a pagar */}
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900">Total a pagar</span>
              <span className="font-bold text-blue-600">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* --- BOTÓN DE MERCADOPAGO --- */}
          <div className="mt-6">
            <PaymentButton pedidoId={order.id} monto={order.total} />
          </div>
        </div>
      </main>
    </div>
  )
}
