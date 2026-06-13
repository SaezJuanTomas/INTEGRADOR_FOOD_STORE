/**
 * Punto de entrada de la aplicación React.
 * Configura el router con las rutas de la aplicación.
 *
 * --- RUTAS ---
 * /                         -> ProductsPage (listado de productos)
 * /cart                     -> CartPage (carrito de compras)
 * /payment/:orderId         -> PaymentPage (resumen y botón de pago)
 * /orders/:id/success       -> SuccessPage (resultado exitoso post-pago)
 * /orders/:id/failure       -> FailurePage (pago rechazado)
 * *                         -> Redirect a / (cualquier otra ruta)
 *
 * --- FLUJO DE NAVEGACIÓN DEL PAGO ---
 *
 * ProductsPage  -->  CartPage  -->  PaymentPage  -->  [MercadoPago]
 *                                                       |
 *                                          ┌────────────┴────────────┐
 *                                     SuccessPage              FailurePage
 *                                          |                        |
 *                                     ProductsPage          PaymentPage (reintento)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProductsPage from './pages/ProductsPage'
import CartPage from './pages/CartPage'
import PaymentPage from './pages/PaymentPage'
import SuccessPage, { FailurePage } from './pages/SuccessPage'

function App() {
  return (
    // BrowserRouter provee el contexto de navegación a toda la app
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/payment/:orderId" element={<PaymentPage />} />
        <Route path="/orders/:id/success" element={<SuccessPage />} />
        <Route path="/orders/:id/failure" element={<FailurePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
