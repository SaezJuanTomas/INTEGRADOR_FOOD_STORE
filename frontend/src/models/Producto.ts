export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  imagenes_url: string | null;
  tiempo_prep_min: number | null;
  disponible: boolean;
  categoria_id: number | null;
  ingrediente_ids: number[];
}

export interface ProductoCreate {
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  imagenes_url: string | null;
  tiempo_prep_min: number | null;
  disponible: boolean;
  categoria_id: number | null;
  ingrediente_ids: number[];
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string | null;
  precio_base?: number;
  imagenes_url?: string | null;
  tiempo_prep_min?: number | null;
  disponible?: boolean;
  categoria_id?: number | null;
  ingrediente_ids?: number[];
}
