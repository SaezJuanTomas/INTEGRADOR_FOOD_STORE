/**
 * Componente PaymentButton.
 *
 * ES EL COMPONENTE MÁS IMPORTANTE DEL FRONTEND.
 * Es el que inicia el flujo de pago con MercadoPago.
 *
 * --- FLUJO ---
 * 1. Usuario hace clic en "Pagar con MercadoPago"
 * 2. El componente llama a POST /api/payments/create-preference
 * 3. El backend crea una preferencia en MP y devuelve init_point
 * 4. Este componente redirige al usuario a init_point
 *    (window.location.href = init_point)
 * 5. El usuario paga (o cancela) en la página de MercadoPago
 * 6. MP redirige al usuario de vuelta a nuestro frontend
 *
 * --- REDIRECT VS CHECKOUT PRO ---
 * Este proyecto usa redirect (no checkout pro con SDK de frontend).
 *
 * Redirect (esta implementación):
 *   + No necesita SDK de frontend
 *   + El token de MP nunca toca el frontend
 *   - El usuario "sale" de nuestro sitio
 *
 * Checkout Pro (con @mercadopago/sdk-react):
 *   + El usuario no sale del sitio
 *   + Mejor UX
 *   - Más complejo
 *   - El token de tarjeta pasa por el frontend
 *
 * Para un proyecto simple, redirect es la opción correcta.
 */
import { useState } from 'react'
import { api } from '../api'

// VITE_MP_PUBLIC_KEY se usa solo como flag para saber si MP está configurado.
// La clave pública NO es secreta, puede estar en el frontend.
const VITE_MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY

interface PaymentButtonProps {
  pedidoId: number
  monto: number
}

export function PaymentButton({ pedidoId, monto }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si no hay public key, MP no está configurado.
  // Mostramos un mensaje en lugar del botón de pago.
  const mpConfigured = !!VITE_MP_PUBLIC_KEY

  /**
   * Inicia el flujo de pago con MercadoPago.
   *
   * 1. Verifica que MP esté configurado
   * 2. Llama al backend para crear la preferencia de pago
   * 3. Redirige al usuario a la URL de pago de MP
   *
   * IMPORTANTE: El backend también verifica que MP_ACCESS_TOKEN
   * esté configurado. Esta doble verificación (frontend + backend)
   * asegura que el error se muestre rápido (frontend) y que
   * sea seguro (backend nunca expone el token).
   */
  const handlePagar = async () => {
    if (!mpConfigured) {
      setError('MercadoPago no está configurado. Configure VITE_MP_PUBLIC_KEY en el .env.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // POST al backend para crear la preferencia en MP
      const res = await api.post('/pagos/create-preference', {
        pedido_id: pedidoId,
      })

      const { init_point } = res.data

      // Redirigir al usuario a la página de pago de MercadoPago
      if (init_point) {
        window.location.href = init_point
      } else {
        setError('Error al obtener el punto de pago')
      }
    } catch (err: any) {
      // Si el backend devuelve un error con detalle, lo mostramos
      const detail = err.response?.data?.detail || 'Error al iniciar el pago'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Mensaje de error si algo sale mal */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handlePagar}
        disabled={loading}
        className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          /* Spinner mientras se conecta con MP */
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Conectando con MercadoPago...
          </span>
        ) : (
          `Pagar $${monto.toFixed(2)} con MercadoPago`
        )}
      </button>

      <p className="text-center text-xs text-gray-400">Pago seguro vía MercadoPago</p>
    </div>
  )
}
