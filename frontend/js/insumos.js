document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const form = document.getElementById("ingredienteForm");
  const newButton = document.getElementById("newIngredienteBtn");
  const cancelButton = document.getElementById("cancelIngredienteBtn");
  const message = document.getElementById("insumosMessage");
  const tableBody = document.getElementById("ingredientesTableBody");
  const totalLabel = document.getElementById("totalLabel");

  const idInput = document.getElementById("ingredienteId");
  const nombreInput = document.getElementById("ingredienteNombre");
  const descripcionInput = document.getElementById("ingredienteDescripcion");
  const alergenoInput = document.getElementById("ingredienteAlergeno");

  if (newButton) {
    newButton.addEventListener("click", () => showForm());
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => hideForm());
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  loadIngredientes();

  function setMessage(text, isError = false) {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.classList.toggle("danger-text", isError);
  }

  function showForm(data = null) {
    form.classList.remove("hidden");
    setMessage("");

    if (data) {
      idInput.value = data.id;
      nombreInput.value = data.nombre || "";
      descripcionInput.value = data.descripcion || "";
      alergenoInput.checked = Boolean(data.es_alergeno);
    } else {
      form.reset();
      idInput.value = "";
    }

    nombreInput.focus();
  }

  function hideForm() {
    form.reset();
    idInput.value = "";
    form.classList.add("hidden");
    setMessage("");
  }

  async function loadIngredientes() {
    setMessage("Cargando insumos...");

    try {
      const response = await fetch(getApiUrl("/ingredientes?offset=0&limit=100"), {
        headers: authHeaders(),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || "No se pudieron cargar los insumos.");
      }

      renderTable(payload.data || []);
      totalLabel.textContent = `Total: ${payload.total ?? 0}`;
      setMessage("");
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function renderTable(items) {
    if (!tableBody) {
      return;
    }

    if (!items.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No hay insumos cargados.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${escapeHtml(item.nombre)}</td>
            <td>${escapeHtml(item.descripcion || "-")}</td>
            <td>${item.es_alergeno ? "Sí" : "No"}</td>
            <td>
              <div class="row-actions">
                <button class="button button-secondary small-button" data-action="edit" data-id="${item.id}">Editar</button>
                <button class="button small-button danger-link" data-action="delete" data-id="${item.id}">Eliminar</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");

    tableBody.querySelectorAll("button[data-action='edit']").forEach((button) => {
      button.addEventListener("click", () => {
        const item = items.find((entry) => String(entry.id) === button.dataset.id);
        if (item) {
          showForm(item);
        }
      });
    });

    tableBody.querySelectorAll("button[data-action='delete']").forEach((button) => {
      button.addEventListener("click", () => deleteIngrediente(button.dataset.id));
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const id = idInput.value;
    const payload = {
      nombre: nombreInput.value.trim(),
      descripcion: descripcionInput.value.trim() || null,
      es_alergeno: alergenoInput.checked,
    };

    if (!payload.nombre) {
      setMessage("El nombre es obligatorio.", true);
      return;
    }

    const isEdit = Boolean(id);
    const endpoint = isEdit ? `/ingredientes/${id}` : "/ingredientes";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const response = await fetch(getApiUrl(endpoint), {
        method,
        headers: authHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "No se pudo guardar el insumo.");
      }

      hideForm();
      setMessage(isEdit ? "Insumo actualizado." : "Insumo creado.");
      loadIngredientes();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  async function deleteIngrediente(id) {
    const confirmed = window.confirm("¿Querés eliminar este insumo?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/ingredientes/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "No se pudo eliminar el insumo.");
      }

      setMessage("Insumo eliminado.");
      loadIngredientes();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
});