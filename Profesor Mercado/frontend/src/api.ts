/**
 * Configuración de Axios para la comunicación con el backend.
 *
 * Axios es un cliente HTTP que nos permite hacer peticiones
 * al backend de forma más cómoda que fetch nativo.
 *
 * Características:
 * - Base URL configurable via VITE_API_URL
 * - Headers por defecto (Content-Type: application/json)
 * - Manejo de errores integrado (err.response)
 * - Transformación automática de JSON
 */
import axios from 'axios'

// VITE_API_URL se configura en .env
// Si no está configurada, usa localhost:8000 como fallback
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Instancia compartida de Axios.
 * Todos los archivos importan esta instancia en lugar de crear una nueva.
 *
 * Uso:
 *   import { api } from '../api'
 *   const res = await api.get('/products')
 *   const res = await api.post('/orders', { items: [...] })
 */
export const api = axios.create({
  baseURL: `${VITE_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})
