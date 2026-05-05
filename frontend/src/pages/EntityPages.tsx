import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../components/Modal";
import type { Categoria, CategoriaCreate, CategoriaUpdate } from "../models/Categoria";
import type { Ingrediente, IngredienteCreate, IngredienteUpdate } from "../models/Ingrediente";
import type { Producto, ProductoCreate, ProductoUpdate } from "../models/Producto";
import {
  categoriaService,
  ingredienteService,
  productoService,
  type CrudService,
} from "../services/api";

const PAGE_SIZE = 3;

interface EntityForm {
  nombre: string;
  descripcion: string;
  numberValue: number;
  secondFlag: boolean;
}

interface EntityConfig<T, TCreate, TUpdate> {
  key: "categorias" | "productos" | "ingredientes";
  title: string;
  secondFilterLabel: string;
  secondFilterType: "text" | "boolean";
  secondFilterValue: (item: T) => string;
  numberValue: (item: T) => number;
  numberLabel: string;
  service: CrudService<T, TCreate, TUpdate>;
  toForm: (item: T | null) => EntityForm;
  toCreate: (form: EntityForm) => TCreate;
  toUpdate: (form: EntityForm) => TUpdate;
}

interface BaseEntity {
  id: number;
  nombre: string;
  descripcion: string | null;
}

function EntityPage<T extends BaseEntity, TCreate, TUpdate>({ config }: { config: EntityConfig<T, TCreate, TUpdate> }): JSX.Element {
  const queryClient = useQueryClient();

  const [textFilter, setTextFilter] = useState<string>("");
  const [secondFilter, setSecondFilter] = useState<string>("");
  const [minNumber, setMinNumber] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [form, setForm] = useState<EntityForm>(config.toForm(null));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const listQuery = useQuery({
    queryKey: [config.key],
    queryFn: () => config.service.getAll(0, 100),
  });

  const createMutation = useMutation({
    mutationFn: (payload: TCreate) => config.service.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.key] });
      setFeedback({ type: "success", message: "Registro creado correctamente." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo crear el registro.";
      setFeedback({ type: "error", message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TUpdate }) => config.service.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.key] });
      setFeedback({ type: "success", message: "Registro actualizado correctamente." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el registro.";
      setFeedback({ type: "error", message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => config.service.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.key] });
      setFeedback({ type: "success", message: "Baja logica aplicada correctamente." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo aplicar la baja logica.";
      setFeedback({ type: "error", message });
    },
  });

  const allRows = listQuery.data?.data ?? [];

  const filtered = useMemo<T[]>(() => {
    const normalizedText = textFilter.toLowerCase().trim();
    const normalizedSecond = secondFilter.toLowerCase().trim();

    return allRows.filter((item) => {
      const textMatches =
        item.nombre.toLowerCase().includes(normalizedText) ||
        (item.descripcion ?? "").toLowerCase().includes(normalizedText);

      const secondMatches = config.secondFilterValue(item).toLowerCase().includes(normalizedSecond);
      const numberMatches = config.numberValue(item) >= minNumber;

      return textMatches && secondMatches && numberMatches;
    });
  }, [allRows, config, minNumber, secondFilter, textFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const resetModal = (): void => {
    setEditingItem(null);
    setForm(config.toForm(null));
    setIsModalOpen(false);
  };

  const openCreate = (): void => {
    setEditingItem(null);
    setForm(config.toForm(null));
    setIsModalOpen(true);
  };

  const openEdit = (item: T): void => {
    setEditingItem(item);
    setForm(config.toForm(item));
    setIsModalOpen(true);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, payload: config.toUpdate(form) });
    } else {
      await createMutation.mutateAsync(config.toCreate(form));
    }

    resetModal();
  };

  const onDelete = async (id: number): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  const clearFilters = (): void => {
    setTextFilter("");
    setSecondFilter("");
    setMinNumber(0);
    setCurrentPage(1);
  };

  const isBooleanSecond = config.secondFilterType === "boolean";

  return (
    <section className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-orange-900">{config.title}</h2>
        <button onClick={openCreate} className="rounded bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm" type="button">
          Crear
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input
          className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
          placeholder="Texto (nombre/descripcion)"
          value={textFilter}
          onChange={(event) => {
            setTextFilter(event.target.value);
            setCurrentPage(1);
          }}
        />

        {isBooleanSecond ? (
          <select
            className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            value={secondFilter}
            onChange={(event) => {
              setSecondFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">{config.secondFilterLabel}</option>
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        ) : (
          <input
            className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder={config.secondFilterLabel}
            value={secondFilter}
            onChange={(event) => {
              setSecondFilter(event.target.value);
              setCurrentPage(1);
            }}
          />
        )}

        <input
          className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
          type="number"
          min={0}
          value={minNumber}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            setMinNumber(Number.isNaN(parsed) ? 0 : parsed);
            setCurrentPage(1);
          }}
          placeholder={config.numberLabel}
        />

        <button type="button" onClick={clearFilters} className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          Limpiar filtros
        </button>
      </div>

      {feedback ? (
        <p className={`mb-3 rounded px-3 py-2 text-sm ${feedback.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {feedback.message}
        </p>
      ) : null}

      {listQuery.isLoading ? <p className="text-sm text-orange-800">Cargando...</p> : null}
      {listQuery.isError ? <p className="text-sm text-red-600">Error: {(listQuery.error as Error).message}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-orange-100 text-left text-orange-900">
              <th className="border px-3 py-2">ID</th>
              <th className="border px-3 py-2">Nombre</th>
              <th className="border px-3 py-2">Descripcion</th>
              <th className="border px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.nombre}</td>
                <td className="border px-3 py-2">{item.descripcion ?? "-"}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(item)} className="rounded bg-amber-400 px-2 py-1 text-white shadow-sm">
                      Editar
                    </button>
                    <button type="button" onClick={() => void onDelete(item.id)} className="rounded bg-orange-600 px-2 py-1 text-white shadow-sm">
                      Baja logica
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !listQuery.isLoading ? (
              <tr>
                <td className="border px-3 py-2 text-center text-orange-700" colSpan={4}>
                  Sin datos
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p>
          Pagina {currentPage} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} title={editingItem ? `Editar ${config.title}` : `Crear ${config.title}`} onClose={resetModal}>
        <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3">
          <input
            className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            required
          />
          <textarea
            className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="Descripcion"
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
          />

          <label className="text-sm font-medium text-orange-900">{config.numberLabel}</label>
          <input
            className="rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            type="number"
            min={0}
            value={form.numberValue}
            onChange={(event) => setForm((prev) => ({ ...prev, numberValue: Number(event.target.value) }))}
          />

          {isBooleanSecond ? (
            <label className="flex items-center gap-2 text-orange-900">
              <input
                type="checkbox"
                checked={form.secondFlag}
                onChange={(event) => setForm((prev) => ({ ...prev, secondFlag: event.target.checked }))}
              />
              <span>{config.secondFilterLabel}</span>
            </label>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">
              Cancelar
            </button>
            <button type="submit" className="rounded bg-orange-500 px-3 py-2 font-medium text-white shadow-sm">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

const categoriaConfig: EntityConfig<Categoria, CategoriaCreate, CategoriaUpdate> = {
  key: "categorias",
  title: "Categorias",
  secondFilterLabel: "Descripcion",
  secondFilterType: "text",
  secondFilterValue: (item) => item.descripcion ?? "",
  numberValue: (item) => item.orden_display,
  numberLabel: "Orden minimo",
  service: categoriaService,
  toForm: (item) => ({
    nombre: item?.nombre ?? "",
    descripcion: item?.descripcion ?? "",
    numberValue: item?.orden_display ?? 0,
    secondFlag: false,
  }),
  toCreate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    orden_display: form.numberValue,
  }),
  toUpdate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    orden_display: form.numberValue,
  }),
};

const productoConfig: EntityConfig<Producto, ProductoCreate, ProductoUpdate> = {
  key: "productos",
  title: "Productos",
  secondFilterLabel: "Disponible",
  secondFilterType: "boolean",
  secondFilterValue: (item) => (item.disponible ? "si" : "no"),
  numberValue: (item) => Number(item.precio_base),
  numberLabel: "Precio minimo",
  service: productoService,
  toForm: (item) => ({
    nombre: item?.nombre ?? "",
    descripcion: item?.descripcion ?? "",
    numberValue: item ? Number(item.precio_base) : 0,
    secondFlag: item?.disponible ?? true,
  }),
  toCreate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    precio_base: form.numberValue,
    imagenes_url: null,
    tiempo_prep_min: null,
    disponible: form.secondFlag,
    categoria_id: null,
    ingrediente_ids: [],
  }),
  toUpdate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    precio_base: form.numberValue,
    disponible: form.secondFlag,
  }),
};

const ingredienteConfig: EntityConfig<Ingrediente, IngredienteCreate, IngredienteUpdate> = {
  key: "ingredientes",
  title: "Ingredientes",
  secondFilterLabel: "Es alergeno",
  secondFilterType: "boolean",
  secondFilterValue: (item) => (item.es_alergeno ? "si" : "no"),
  numberValue: (item) => item.id,
  numberLabel: "ID minimo",
  service: ingredienteService,
  toForm: (item) => ({
    nombre: item?.nombre ?? "",
    descripcion: item?.descripcion ?? "",
    numberValue: 0,
    secondFlag: item?.es_alergeno ?? false,
  }),
  toCreate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    es_alergeno: form.secondFlag,
  }),
  toUpdate: (form) => ({
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    es_alergeno: form.secondFlag,
  }),
};

export function CategoriasPage(): JSX.Element {
  return <EntityPage config={categoriaConfig} />;
}

export function ProductosPage(): JSX.Element {
  return <EntityPage config={productoConfig} />;
}

export function IngredientesPage(): JSX.Element {
  return <EntityPage config={ingredienteConfig} />;
}
