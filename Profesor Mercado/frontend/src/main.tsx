/**
 * Punto de entrada de la aplicación.
 * Renderiza el componente App dentro de StrictMode.
 *
 * StrictMode:
 * - No afecta al build de producción
 * - En desarrollo, renderiza dos veces para detectar efectos secundarios
 * - Ayuda a encontrar problemas de rendimiento y ciclos de vida
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
