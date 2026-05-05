import type { Categoria, CategoriaCreate, CategoriaUpdate } from "../models/Categoria";
import type { Ingrediente, IngredienteCreate, IngredienteUpdate } from "../models/Ingrediente";
import type { Producto, ProductoCreate, ProductoUpdate } from "../models/Producto";

const API_BASE_URL = "http://localhost:8000";
const TOKEN_KEY = "food_store_token";

interface ListResponse<T> {
  data: T[];
  total: number;
}

interface LoginPayload {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CrudService<T, TCreate, TUpdate> {
  getAll: (offset: number, limit: number) => Promise<ListResponse<T>>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: number, payload: TUpdate) => Promise<T>;
  delete: (id: number) => Promise<void>;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function request<T>(
  path: string,
  options: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Error en la API");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildCrudService<T, TCreate, TUpdate>(resourcePath: string): CrudService<T, TCreate, TUpdate> {
  return {
    getAll: (offset: number, limit: number) =>
      request<ListResponse<T>>(`${resourcePath}?offset=${offset}&limit=${limit}`),
    create: (payload: TCreate) =>
      request<T>(resourcePath, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: TUpdate) =>
      request<T>(`${resourcePath}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`${resourcePath}/${id}`, {
        method: "DELETE",
      }),
  };
}

export const categoriaService = buildCrudService<Categoria, CategoriaCreate, CategoriaUpdate>("/categorias");
export const productoService = buildCrudService<Producto, ProductoCreate, ProductoUpdate>("/productos");
export const ingredienteService = buildCrudService<Ingrediente, IngredienteCreate, IngredienteUpdate>("/ingredientes");

export type { ListResponse };
