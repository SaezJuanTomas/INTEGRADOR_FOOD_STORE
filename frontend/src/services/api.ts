import type { Categoria, CategoriaCreate, CategoriaDetail, CategoriaUpdate } from "../models/Categoria";
import type { Ingrediente, IngredienteCreate, IngredienteDetail, IngredienteUpdate } from "../models/Ingrediente";
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
  getAll: (offset: number, limit: number, includeDeleted?: boolean) => Promise<ListResponse<T>>;
  getById: (id: number) => Promise<T>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: number, payload: TUpdate) => Promise<T>;
  delete: (id: number) => Promise<void>;
  restore: (id: number) => Promise<T>;
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
    getAll: (offset: number, limit: number, includeDeleted?: boolean) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (includeDeleted) {
        params.append("include_deleted", "true");
      }
      return request<ListResponse<T>>(`${resourcePath}?${params.toString()}`);
    },
    getById: (id: number) => request<T>(`${resourcePath}/${id}`),
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
    restore: (id: number) =>
      request<T>(`${resourcePath}/${id}/restore`, {
        method: "PATCH",
      }),
  };
}

export const categoriaService = buildCrudService<Categoria, CategoriaCreate, CategoriaUpdate>("/categorias");
export const productoService = buildCrudService<Producto, ProductoCreate, ProductoUpdate>("/productos");
export const ingredienteService = buildCrudService<Ingrediente, IngredienteCreate, IngredienteUpdate>("/ingredientes");

export function getIngredienteDetail(ingredienteId: number): Promise<IngredienteDetail> {
  return request<IngredienteDetail>(`/ingredientes/${ingredienteId}/detail`);
}

export function getCategoriaDetail(categoriaId: number): Promise<CategoriaDetail> {
  return request<CategoriaDetail>(`/categorias/${categoriaId}/detail`);
}

export type { ListResponse };
