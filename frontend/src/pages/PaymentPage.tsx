import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import { PaymentButton } from '../components/PaymentButton'

interface OrderData {
  id: number
  total: number
  estado_codigo: string
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cashLoading, setCashLoading] = useState(false)

  useEffect(() => {
    api.get(`/pedidos/${orderId}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('No se pudo cargar el pedido'))
      .finally(() => setLoading(false))
  }, [orderId])

  const pagarEnEfectivo = async () => {
    setCashLoading(true)
    try {
      await api.patch(`/pedidos/${orderId}/confirmar`, { forma_pago_codigo: "EFECTIVO" })
      navigate(`/mis-pedidos`)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Error al confirmar pedido"
      setError(msg)
    } finally {
      setCashLoading(false)
    }
  }

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
          <Link to="/carrito" className="text-sm text-blue-600 hover:text-blue-800">&larr; Volver al carrito</Link>
          <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen del Pedido #{order.id}
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado</span>
              <span className="font-medium text-yellow-600">
                Pendiente de pago
              </span>
            </div>
            <hr />
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900">Total a pagar</span>
              <span className="font-bold text-blue-600">
                ${Number(order.total).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <PaymentButton pedidoId={order.id} monto={Number(order.total)} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">O</span>
              </div>
            </div>

            <button
              type="button"
              onClick={pagarEnEfectivo}
              disabled={cashLoading}
              className="w-full rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cashLoading ? "Confirmando..." : "Pagar en efectivo"}
            </button>
            <p className="text-center text-xs text-gray-400">El pedido quedará confirmado y lo abonás al retirar.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
