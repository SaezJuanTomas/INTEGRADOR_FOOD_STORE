export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_alergeno: boolean;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion: string | null;
  es_alergeno: boolean;
}

export interface IngredienteUpdate {
  nombre?: string;
  descripcion?: string | null;
  es_alergeno?: boolean;
}
