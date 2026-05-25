import { createContext, useContext, useMemo, useState } from "react";
import { loginRequest } from "../services/api";

const TOKEN_KEY = "food_store_token";
const USER_KEY = "food_store_user";
const ROLES_KEY = "food_store_roles";
const CART_KEY = "food_store_cart";

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  celular?: string;
  activo: boolean;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  roles: string[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isStock: boolean;
  isPedidos: boolean;
  hasRole: (role: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
    const normalizeRole = (role: string): string => role.trim().toUpperCase();

    const hasRole = (role: string): boolean => {
      const normalized = normalizeRole(role);
      if (normalized === "CLIENT") {
        return roles.some((current) => ["CLIENT", "CLIENTE"].includes(normalizeRole(current)));
      }
      return roles.some((current) => normalizeRole(current) === normalized);
    };

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [roles, setRoles] = useState<string[]>(() => {
    const stored = localStorage.getItem(ROLES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const login = async (email: string, password: string): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      const msg = "Email y clave son obligatorios.";
      console.error("❌", msg);
      throw new Error(msg);
    }

    try {
      console.log("🔐 AuthContext.login iniciando...");
      const response = await loginRequest({ email, password });
      console.log("✅ LoginRequest exitoso. Response:", response);
      const normalizedRoles = (response.roles || []).map((role) => role.trim().toUpperCase());
      
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
      localStorage.setItem(ROLES_KEY, JSON.stringify(normalizedRoles));
      console.log("💾 Datos guardados en localStorage");
      
      setToken(response.access_token);
      setUser(response.usuario);
      setRoles(normalizedRoles);
      console.log("🔄 Estado actualizado en AuthContext");
    } catch (error) {
      console.error("❌ Error en AuthContext.login:", error);
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(CART_KEY);
    setToken(null);
    setUser(null);
    setRoles([]);
  };

  const isAdmin = hasRole("ADMIN");
  const isClient = hasRole("CLIENT");
  const isStock = hasRole("STOCK");
  const isPedidos = hasRole("PEDIDOS");

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      roles,
      isAuthenticated: Boolean(token),
      isAdmin,
      isClient,
      isStock,
      isPedidos,
      hasRole,
      login,
      logout,
    }),
    [token, user, roles, isAdmin, isClient, isStock, isPedidos]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
