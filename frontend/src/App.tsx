import { useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CategoriasPage, IngredientesPage, ProductosPage } from "./pages/EntityPages";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

interface DashboardLayoutProps {
  children: JSX.Element;
  section?: string;
}

function DashboardLayout({ children, section }: DashboardLayoutProps): JSX.Element {
  const { logout } = useAuth();
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 p-4 text-slate-800">
      <div className="mx-auto max-w-6xl">
      <header className="mb-4 rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900"
            >
              Menu
            </button>
            {section ? (
              <span className="text-sm font-medium text-orange-700">{section}</span>
            ) : null}
          </div>
          <button type="button" onClick={logout} className="rounded bg-orange-500 px-3 py-2 text-sm text-white shadow-sm">
            Logout
          </button>
        </div>
        {open ? (
          <nav className="mt-3 flex flex-wrap gap-2">
            <NavLink to="/home" className="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900">
              Home
            </NavLink>
            <NavLink to="/categorias" className="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900">
              Categorias
            </NavLink>
            <NavLink to="/productos" className="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900">
              Productos
            </NavLink>
            <NavLink to="/ingredientes" className="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900">
              Ingredientes
            </NavLink>
          </nav>
        ) : null}
      </header>
      {children}
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <DashboardLayout section="Home">
              <HomePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categorias"
        element={
          <ProtectedRoute>
            <DashboardLayout section="📂 Categorias">
              <CategoriasPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/productos"
        element={
          <ProtectedRoute>
            <DashboardLayout section="🛍️ Productos">
              <ProductosPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ingredientes"
        element={
          <ProtectedRoute>
            <DashboardLayout section="🧂 Ingredientes">
              <IngredientesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
