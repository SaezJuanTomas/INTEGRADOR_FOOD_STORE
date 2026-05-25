import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { UsuarioPublic } from "../services/api";
import { listUsuarios, updateUsuario } from "../services/api";

interface UserFormState {
  nombre: string;
  apellido: string;
  celular: string;
  activo: boolean;
}

function buildFormState(user: UsuarioPublic): UserFormState {
  return {
    nombre: user.nombre,
    apellido: user.apellido,
    celular: user.celular ?? "",
    activo: user.activo,
  };
}

export function UsuariosAdminPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UsuarioPublic | null>(null);
  const [form, setForm] = useState<UserFormState | null>(null);
  const [includeInactive, setIncludeInactive] = useState<boolean>(true);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", "admin", includeInactive],
    queryFn: () => listUsuarios(0, 100, includeInactive),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser || !form) {
        throw new Error("No hay usuario seleccionado");
      }

      return updateUsuario(editingUser.id, {
        nombre: form.nombre,
        apellido: form.apellido,
        celular: form.celular.trim() ? form.celular.trim() : null,
        activo: form.activo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios", "admin"] });
      setEditingUser(null);
      setForm(null);
      window.alert("Usuario actualizado correctamente");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (user: UsuarioPublic) => {
      return updateUsuario(user.id, { activo: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios", "admin"] });
      window.alert("Usuario reactivado correctamente");
    },
  });

  const openEditor = (user: UsuarioPublic): void => {
    setEditingUser(user);
    setForm(buildFormState(user));
  };

  if (usuariosQuery.isLoading) {
    return <p className="text-slate-700">Cargando usuarios...</p>;
  }

  if (usuariosQuery.isError) {
    return <p className="text-red-600">No se pudieron cargar los usuarios.</p>;
  }

  const usuarios = usuariosQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-orange-900">Usuarios</h1>
        <p className="mt-1 text-sm text-slate-700">Edición rápida de datos de usuarios para administración.</p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          Mostrar usuarios inactivos
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-orange-100 bg-white">
        <table className="min-w-full divide-y divide-orange-100 text-sm">
          <thead className="bg-orange-50 text-left text-orange-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Celular</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50">
            {usuarios.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-slate-800">{user.nombre} {user.apellido}</td>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                <td className="px-4 py-3 text-slate-700">{user.celular || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {user.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(user)}
                      className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                    >
                      Editar
                    </button>
                    {!user.activo ? (
                      <button
                        type="button"
                        onClick={() => reactivateMutation.mutate(user)}
                        disabled={reactivateMutation.isPending}
                        className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reactivateMutation.isPending ? "Reactivando..." : "Dar de alta"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && form ? (
        <div className="space-y-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-orange-900">Editar usuario: {editingUser.email}</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">
              Nombre
              <input
                type="text"
                value={form.nombre}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, nombre: event.target.value } : prev))}
                className="rounded border border-orange-200 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              Apellido
              <input
                type="text"
                value={form.apellido}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, apellido: event.target.value } : prev))}
                className="rounded border border-orange-200 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
              Celular
              <input
                type="text"
                value={form.celular}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, celular: event.target.value } : prev))}
                className="rounded border border-orange-200 px-3 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, activo: event.target.checked } : prev))}
              />
              Usuario activo
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setForm(null);
              }}
              className="rounded border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900 hover:bg-orange-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
