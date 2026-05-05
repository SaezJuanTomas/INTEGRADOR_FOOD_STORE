export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden_display: number;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion: string | null;
  orden_display: number;
}

export interface CategoriaUpdate {
  nombre?: string;
  descripcion?: string | null;
  orden_display?: number;
}
