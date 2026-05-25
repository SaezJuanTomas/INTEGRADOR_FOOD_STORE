import { useAuth } from "./AuthContext";

export function useRoles() {
  const { roles, hasRole, isAdmin, isClient, isStock, isPedidos } = useAuth();
  return { roles, hasRole, isAdmin, isClient, isStock, isPedidos };
}
