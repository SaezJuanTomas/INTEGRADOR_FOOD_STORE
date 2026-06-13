/**
 * Páginas de resultado del pago (Success y Failure).
 *
 * MP redirige al usuario a estas páginas después del pago.
 * La URL incluye query params como payment_id.
 *
 * --- SUCCESSPAGE ---
 * Cuando MP redirige con status=success:
 * 1. Muestra un spinner mientras confirma el pago
 * 2. Llama a POST /api/payments/confirm con el payment_id
 * 3. El backend consulta a MP el estado REAL del pago
 * 4. Si MP dice "approved": muestra pantalla de éxito
 * 5. Si MP dice otro estado: muestra pantalla de error
 *
 * --- FAILUREPAGE ---
 * Cuando MP redirige con status=failure:
 * 1. Muestra que el pago fue rechazado
 * 2. Permite reintentar con un nuevo PaymentButton
 *
 * --- POR QUÉ CONFIRMAR EN EL BACKEND ---
 * No confiamos en el redirect de MP. Alguien podría:
 *   - Falsificar la URL /orders/1/success?payment_id=999
 *   - Modificar los query params
 *
 * Por eso SIEMPRE consultamos a la API de MP:
 *   "¿El pago con ID xxx está realmente aprobado?"
 *
 * --- ESTADOS DE SuccessPage ---
 * - confirmando: Llamando al backend para verificar
 * - aprobado: MP confirmó el pago
 * - rechazado: MP rechazó el pago
 * - error: No se pudo conectar con el backend o no hay payment_id
 */
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'
import { PaymentButton } from '../components/PaymentButton'

type Estado = 'confirmando' | 'aprobado' | 'rechazado' | 'error'

export default function SuccessPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [estado, setEstado] = useState<Estado>('confirmando')

  const pedidoId = Number(id)
  // payment_id viene como query param en la redirect de MP
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    if (!paymentId) {
      // Sin payment_id no podemos confirmar
      // (puede pasar si ngrok pierde los query params)
      setEstado('error')
      return
    }

    /**
     * Confirma el pago consultando el estado REAL en MP.
     * El backend nunca confía en el redirect; siempre verifica con MP.
     */
    async function confirmar() {
      try {
        const res = await api.post('/pagos/confirm', {
          pedido_id: pedidoId,
          payment_id: Number(paymentId),
        })
        setEstado(res.data.estado === 'aprobado' ? 'aprobado' : 'rechazado')
      } catch {
        setEstado('error')
      }
    }

    confirmar()
    // Solo se ejecuta una vez al montar (deps vacías no, usamos pedidoId/paymentId)
  }, [pedidoId, paymentId])

  // --- ESTADO: CONFIRMANDO ---
  if (estado === 'confirmando') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-blue-500 mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600">Confirmando tu pago...</p>
      </div>
    )
  }

  // --- ESTADO: APROBADO ---
  if (estado === 'aprobado') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h1>
        <p className="text-gray-500 mb-6">Tu pago fue procesado correctamente.</p>
        <Link to="/" className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
          Volver al Catálogo
        </Link>
      </div>
    )
  }

  // --- ESTADO: ERROR (rechazado o error de conexión) ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Error en el Pago</h1>
      <p className="text-gray-500 mb-6">Hubo un problema al procesar tu pago.</p>
      <Link to={`/payment/${pedidoId}`} className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
        Reintentar Pago
      </Link>
    </div>
  )
}

/**
 * FailurePage: cuando MP redirige con status=failure.
 *
 * El pago fue rechazado (tarjeta sin fondos, datos incorrectos, etc.).
 * El usuario puede reintentar con un nuevo PaymentButton.
 *
 * Se fetchea GET /api/orders/{id} para obtener el total actualizado.
 */
export function FailurePage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<{ total: number } | null>(null)

  useEffect(() => {
    api.get(`/pedidos/${id}`).then((res) => setOrder(res.data)).catch(() => {})
  }, [id])

  const pedidoId = Number(id)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pago Rechazado</h1>
      <p className="text-gray-500 mb-6">El pago fue rechazado. Podés intentar nuevamente.</p>
      <div className="w-full max-w-xs">
        <PaymentButton pedidoId={pedidoId} monto={order?.total ?? 0} />
      </div>
      <Link to="/cart" className="mt-4 text-sm text-blue-600 hover:text-blue-800">
        Volver al carrito
      </Link>
    </div>
  )
}
