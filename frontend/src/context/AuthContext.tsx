import { createContext, useContext, useMemo, useState } from "react";
import { loginRequest } from "../services/api";

const TOKEN_KEY = "food_store_token";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const login = async (username: string, password: string): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      throw new Error("Usuario y clave son obligatorios.");
    }

    const response = await loginRequest({ username, password });
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setToken(response.access_token);
  };

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token]
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
