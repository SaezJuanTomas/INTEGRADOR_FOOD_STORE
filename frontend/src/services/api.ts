import type { Categoria, CategoriaCreate, CategoriaDetail, CategoriaUpdate } from "../models/Categoria";
import type { Ingrediente, IngredienteCreate, IngredienteDetail, IngredienteUpdate } from "../models/Ingrediente";
import type { Producto, ProductoCreate, ProductoUpdate } from "../models/Producto";

const API_BASE_URLS = ["http://127.0.0.1:8000", "http://localhost:8000"];
const TOKEN_KEY = "food_store_token";

interface ListResponse<T> {
  data: T[];
  total: number;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    celular?: string;
    activo: boolean;
  };
  roles?: string[];
}

export interface UsuarioPublic {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  celular?: string | null;
  activo: boolean;
}

export interface UsuarioUpdatePayload {
  nombre?: string;
  apellido?: string;
  celular?: string | null;
  activo?: boolean;
}

export interface CrudService<T, TCreate, TUpdate> {
  getAll: (offset: number, limit: number, includeDeleted?: boolean) => Promise<ListResponse<T>>;
  getById: (id: number) => Promise<T>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: number, payload: TUpdate) => Promise<T>;
  delete: (id: number) => Promise<void>;
  restore: (id: number) => Promise<T>;
}

export interface DireccionEntregaPublic {
  id: number;
  alias: string;
  linea1: string;
  linea2: string | null;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  es_principal: boolean;
  activo: boolean;
}

export interface DireccionEntregaCreatePayload {
  alias: string;
  linea1: string;
  linea2?: string | null;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  es_principal: boolean;
}

export interface DireccionEntregaUpdatePayload {
  alias?: string;
  linea1?: string;
  linea2?: string | null;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  es_principal?: boolean;
}

export interface UsuarioDetail extends UsuarioPublic {
  roles: Array<{ codigo: string; nombre: string; descripcion?: string | null }>;
  direcciones: DireccionEntregaPublic[];
}

export interface DetallePedidoCreatePayload {
  producto_id: number;
  cantidad: number;
}

export interface PedidoCreatePayload {
  direccion_entrega_id: number;
  detalles: DetallePedidoCreatePayload[];
  notas?: string;
}

export interface ConfirmarPedidoResponse {
  id: number;
  estado_codigo: string;
  total: number;
  mensaje: string;
}

export interface PedidoPublic {
  id: number;
  usuario_id: number;
  direccion_entrega_id: number;
  estado_codigo: string;
  subtotal: number | string;
  descuento: number | string;
  costo_envio: number | string;
  total: number | string;
  notas?: string | null;
  created_at?: string | null;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  console.log("📤 Enviando login request a /auth/login con:", payload.email);
  try {
    const result = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log("📥 Login response recibido:", result);
    return result;
  } catch (error) {
    console.error("❌ Error en loginRequest:", error);
    throw error;
  }
}

async function request<T>(
  path: string,
  options: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  try {
    // Crear AbortController para timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("⏱️ Timeout: La solicitud tardó más de 10 segundos");
      abortController.abort();
    }, 10000); // 10 segundos timeout

    try {
      let lastNetworkError: unknown = null;
      let response: Response | null = null;

      for (const baseUrl of API_BASE_URLS) {
        try {
          response = await fetch(`${baseUrl}${path}`, {
            ...options,
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(options.headers ?? {}),
            },
            // Incluir credenciales (cookies httponly) para que el backend pueda setear/leer la cookie de sesión
            credentials: "include",
          });
          break;
        } catch (networkError) {
          lastNetworkError = networkError;
        }
      }

      if (!response) {
        throw lastNetworkError instanceof Error
          ? lastNetworkError
          : new Error("No se pudo conectar con el backend");
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(errorText || `Error ${response.status} en la API`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error) {
      // Si es un error de red
      if (error.name === "AbortError") {
        console.error("⏱️ Timeout de 10 segundos - El servidor no responde");
          throw new Error("El servidor no responde. ¿Está corriendo en http://127.0.0.1:8000 o http://localhost:8000?");
      }
      if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
        console.error("🌐 Error de conexión - ¿El backend está corriendo?");
          throw new Error("No se puede conectar al servidor. ¿El backend está corriendo en http://127.0.0.1:8000 o http://localhost:8000?");
      }
      throw error;
    }
    throw new Error("Error desconocido en la API");
  }
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

export function listUsuarios(offset = 0, limit = 50): Promise<ListResponse<UsuarioPublic>> {
  return request<ListResponse<UsuarioPublic>>(`/usuarios?offset=${offset}&limit=${limit}`);
}

export function getUsuario(usuarioId: number): Promise<UsuarioDetail> {
  return request<UsuarioDetail>(`/usuarios/${usuarioId}`);
}

export function updateUsuario(usuarioId: number, payload: UsuarioUpdatePayload): Promise<UsuarioDetail> {
  return request<UsuarioDetail>(`/usuarios/${usuarioId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listDireccionesUsuario(
  usuarioId: number,
  offset = 0,
  limit = 20
): Promise<ListResponse<DireccionEntregaPublic>> {
  return request<ListResponse<DireccionEntregaPublic>>(
    `/usuarios/${usuarioId}/direcciones?offset=${offset}&limit=${limit}`
  );
}

export function createDireccionUsuario(
  usuarioId: number,
  payload: DireccionEntregaCreatePayload
): Promise<DireccionEntregaPublic> {
  return request<DireccionEntregaPublic>(`/usuarios/${usuarioId}/direcciones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDireccionUsuario(
  usuarioId: number,
  direccionId: number,
  payload: DireccionEntregaUpdatePayload
): Promise<DireccionEntregaPublic> {
  return request<DireccionEntregaPublic>(`/usuarios/${usuarioId}/direcciones/${direccionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function createPedido(payload: PedidoCreatePayload): Promise<ConfirmarPedidoResponse> {
  return request<ConfirmarPedidoResponse>("/pedidos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function confirmPedido(pedidoId: number): Promise<ConfirmarPedidoResponse> {
  return request<ConfirmarPedidoResponse>(`/pedidos/${pedidoId}/confirmar`, {
    method: "PATCH",
  });
}

export function listPedidos(offset = 0, limit = 50): Promise<ListResponse<PedidoPublic>> {
  return request<ListResponse<PedidoPublic>>(`/pedidos?offset=${offset}&limit=${limit}`);
}

export function getIngredienteDetail(ingredienteId: number): Promise<IngredienteDetail> {
  return request<IngredienteDetail>(`/ingredientes/${ingredienteId}/detail`);
}

export function getCategoriaDetail(categoriaId: number): Promise<CategoriaDetail> {
  return request<CategoriaDetail>(`/categorias/${categoriaId}/detail`);
}

export type { ListResponse };
