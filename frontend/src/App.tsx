import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NavBar } from "./components/NavBar";
import { CategoriasPage, IngredientesPage, ProductosPage } from "./pages/EntityPages";
import { CategoryDetailPage } from "./pages/CategoryDetailPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ClienteDashboard } from "./pages/ClienteDashboard";
import { IngredientDetailPage } from "./pages/IngredientDetailPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { VentasPage } from "./pages/VentasPage";
import { LoginPage } from "./pages/LoginPage";
import { CarritoPage } from "./pages/CarritoPage";
import { MisPedidosPage } from "./pages/MisPedidosPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { ProductosClientePage } from "./pages/ProductosClientePage";
import { UsuariosAdminPage } from "./pages/UsuariosAdminPage";
import { GastosAdminPage } from "./pages/GastosAdminPage";
import { PerfilPage } from "./pages/PerfilPage";

interface DashboardLayoutProps {
  children: JSX.Element;
}

function DashboardLayout({ children }: DashboardLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 text-slate-800">
      <NavBar />
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <CartProvider>
      <Routes>
        {/* Login */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />} />

        {/* Access Denied */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Home - Redirige según rol */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                {isAdmin ? <AdminDashboard /> : <ClienteDashboard />}
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* RUTAS ADMIN */}
        <Route
          path="/categorias"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <CategoriasPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/categoria/:categoriaId"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <CategoryDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingredientes"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <IngredientesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingrediente/:ingredienteId"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <IngredientDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ventas"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <VentasPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <UsuariosAdminPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/gastos"
          element={
            <ProtectedRoute requiredRoles={["ADMIN"]}>
              <DashboardLayout>
                <GastosAdminPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* RUTAS COMUNES (Admin + Cliente) */}
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                {isAdmin ? <ProductosPage /> : <ProductosClientePage />}
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/productos/:productoId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProductDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/producto/:productoId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProductDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* RUTAS CLIENTE */}
        <Route
          path="/carrito"
          element={
            <ProtectedRoute requiredRoles={["CLIENTE"]}>
              <DashboardLayout>
                <CarritoPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mis-pedidos"
          element={
            <ProtectedRoute requiredRoles={["CLIENTE"]}>
              <DashboardLayout>
                <MisPedidosPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute requiredRoles={["CLIENTE"]}>
              <DashboardLayout>
                <PerfilPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </CartProvider>
  );
}
