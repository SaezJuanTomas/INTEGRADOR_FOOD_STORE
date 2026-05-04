document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const form = document.getElementById("ingredienteForm");
  const newButton = document.getElementById("newIngredienteBtn");
  const cancelButton = document.getElementById("cancelIngredienteBtn");
  const message = document.getElementById("ingredientesMessage");
  const tableBody = document.getElementById("ingredientesTableBody");
  const totalLabel = document.getElementById("ingredientesTotalLabel");
  const filteredLabel = document.getElementById("ingredientesFilteredLabel");
  const prevPageButton = document.getElementById("ingredientesPrevPageBtn");
  const nextPageButton = document.getElementById("ingredientesNextPageBtn");
  const pageInfo = document.getElementById("ingredientesPageInfo");
  const filterTextInput = document.getElementById("ingredienteFilterText");
  const filterDescripcionInput = document.getElementById("ingredienteFilterDescripcion");
  const filterAlergenoInput = document.getElementById("ingredienteFilterAlergeno");
  const resetFiltersButton = document.getElementById("ingredienteResetFiltersBtn");

  const idInput = document.getElementById("ingredienteId");
  const nombreInput = document.getElementById("ingredienteNombre");
  const descripcionInput = document.getElementById("ingredienteDescripcion");
  const alergenoInput = document.getElementById("ingredienteAlergeno");
  const pageSize = 8;

  let allIngredientes = [];
  let currentPage = 1;

  if (newButton) {
    newButton.addEventListener("click", () => showForm());
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => hideForm());
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (filterTextInput) {
    filterTextInput.addEventListener("input", () => updateView(true));
  }

  if (filterDescripcionInput) {
    filterDescripcionInput.addEventListener("input", () => updateView(true));
  }

  if (filterAlergenoInput) {
    filterAlergenoInput.addEventListener("change", () => updateView(true));
  }

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
      filterTextInput.value = "";
      filterDescripcionInput.value = "";
      filterAlergenoInput.value = "all";
      updateView(true);
    });
  }

  if (prevPageButton) {
    prevPageButton.addEventListener("click", () => {
      currentPage = Math.max(1, currentPage - 1);
      updateView();
    });
  }

  if (nextPageButton) {
    nextPageButton.addEventListener("click", () => {
      currentPage += 1;
      updateView();
    });
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
    setMessage("Cargando ingredientes...");

    try {
      const response = await fetch(getApiUrl("/ingredientes?offset=0&limit=100"), {
        headers: authHeaders(),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || "No se pudieron cargar los ingredientes.");
      }

      allIngredientes = payload.data || [];
      currentPage = 1;
      updateView();
      setMessage("");
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function updateView(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }

    const filteredItems = filterIngredientes(allIngredientes);
    const totalPages = FOOD_STORE_LIST.getPageCount(filteredItems.length, pageSize);
    currentPage = FOOD_STORE_LIST.clampPage(currentPage, totalPages);
    const pageItems = totalPages === 0 ? [] : FOOD_STORE_LIST.getPageItems(filteredItems, currentPage, pageSize);

    renderTable(pageItems);
    renderPagination(filteredItems.length, totalPages);
    renderTotals(filteredItems.length);
  }

  function filterIngredientes(items) {
    const textQuery = filterTextInput?.value || "";
    const descripcionQuery = filterDescripcionInput?.value || "";
    const alergenoQuery = filterAlergenoInput?.value || "all";

    return items.filter((item) => {
      const matchesText =
        FOOD_STORE_LIST.matches(item.nombre, textQuery) ||
        FOOD_STORE_LIST.matches(item.descripcion, textQuery) ||
        FOOD_STORE_LIST.matches(item.id, textQuery);

      const matchesDescripcion = FOOD_STORE_LIST.matches(item.descripcion, descripcionQuery);
      const matchesAlergeno =
        alergenoQuery === "all" ||
        (alergenoQuery === "yes" ? Boolean(item.es_alergeno) : !Boolean(item.es_alergeno));

      return matchesText && matchesDescripcion && matchesAlergeno;
    });
  }

  function renderTotals(filteredCount) {
    const totalCount = allIngredientes.length;
    const filteredText = filteredCount === totalCount ? "" : ` | Filtrados: ${filteredCount}`;
    if (totalLabel) {
      totalLabel.textContent = `Total: ${totalCount}${filteredText}`;
    }

    if (filteredLabel) {
      filteredLabel.textContent = filteredCount === totalCount ? "Sin filtros activos." : `Mostrando ${filteredCount} de ${totalCount}.`;
    }
  }

  function renderPagination(filteredCount, totalPages) {
    if (pageInfo) {
      pageInfo.textContent = filteredCount === 0 ? "Sin resultados." : `Página ${currentPage} de ${totalPages}`;
    }

    if (prevPageButton) {
      prevPageButton.disabled = currentPage <= 1 || filteredCount === 0;
    }

    if (nextPageButton) {
      nextPageButton.disabled = currentPage >= totalPages || filteredCount === 0;
    }
  }

  function renderTable(items) {
    if (!tableBody) {
      return;
    }

    if (!items.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No hay ingredientes cargados.</td>
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
                <button class="button small-button danger-link" data-action="delete" data-id="${item.id}">Baja</button>
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
        throw new Error(result.detail || "No se pudo guardar el ingrediente.");
      }

      hideForm();
      setMessage(isEdit ? "Ingrediente actualizado." : "Ingrediente creado.");
      loadIngredientes();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  async function deleteIngrediente(id) {
    const confirmed = window.confirm("¿Querés dar de baja este ingrediente?");

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
        throw new Error(payload.detail || "No se pudo dar de baja el ingrediente.");
      }

      setMessage("Ingrediente dado de baja.");
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