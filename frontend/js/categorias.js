document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const form = document.getElementById("categoriaForm");
  const newButton = document.getElementById("newCategoriaBtn");
  const cancelButton = document.getElementById("cancelCategoriaBtn");
  const message = document.getElementById("categoriasMessage");
  const tableBody = document.getElementById("categoriasTableBody");
  const totalLabel = document.getElementById("categoriasTotalLabel");
  const filteredLabel = document.getElementById("categoriasFilteredLabel");
  const prevPageButton = document.getElementById("categoriasPrevPageBtn");
  const nextPageButton = document.getElementById("categoriasNextPageBtn");
  const pageInfo = document.getElementById("categoriasPageInfo");
  const filterTextInput = document.getElementById("categoriaFilterText");
  const filterDescripcionInput = document.getElementById("categoriaFilterDescripcion");
  const filterOrdenMinInput = document.getElementById("categoriaFilterOrdenMin");
  const resetFiltersButton = document.getElementById("categoriaResetFiltersBtn");

  const idInput = document.getElementById("categoriaId");
  const nombreInput = document.getElementById("categoriaNombre");
  const descripcionInput = document.getElementById("categoriaDescripcion");
  const ordenInput = document.getElementById("categoriaOrden");
  const pageSize = 8;

  let allCategorias = [];
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

  if (filterOrdenMinInput) {
    filterOrdenMinInput.addEventListener("input", () => updateView(true));
  }

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
      filterTextInput.value = "";
      filterDescripcionInput.value = "";
      filterOrdenMinInput.value = "";
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

  loadCategorias();

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
      ordenInput.value = Number.isFinite(data.orden_display) ? data.orden_display : 0;
    } else {
      form.reset();
      idInput.value = "";
      ordenInput.value = 0;
    }

    nombreInput.focus();
  }

  function hideForm() {
    form.reset();
    idInput.value = "";
    ordenInput.value = 0;
    form.classList.add("hidden");
    setMessage("");
  }

  async function loadCategorias() {
    setMessage("Cargando categorías...");

    try {
      const response = await fetch(getApiUrl("/categorias?offset=0&limit=100"), {
        headers: authHeaders(),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "No se pudieron cargar las categorías.");
      }

      allCategorias = payload.data || [];
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

    const filteredItems = filterCategorias(allCategorias);
    const totalPages = FOOD_STORE_LIST.getPageCount(filteredItems.length, pageSize);
    currentPage = FOOD_STORE_LIST.clampPage(currentPage, totalPages);
    const pageItems = totalPages === 0 ? [] : FOOD_STORE_LIST.getPageItems(filteredItems, currentPage, pageSize);

    renderTable(pageItems);
    renderPagination(filteredItems.length, totalPages);
    renderTotals(filteredItems.length);
  }

  function filterCategorias(items) {
    const textQuery = filterTextInput?.value || "";
    const descripcionQuery = filterDescripcionInput?.value || "";
    const ordenMinQuery = filterOrdenMinInput?.value.trim();
    const ordenMin = ordenMinQuery ? Number(ordenMinQuery) : null;

    return items.filter((item) => {
      const matchesText =
        FOOD_STORE_LIST.matches(item.nombre, textQuery) ||
        FOOD_STORE_LIST.matches(item.descripcion, textQuery) ||
        FOOD_STORE_LIST.matches(item.id, textQuery) ||
        FOOD_STORE_LIST.matches(item.orden_display, textQuery);

      const matchesDescripcion = FOOD_STORE_LIST.matches(item.descripcion, descripcionQuery);
      const matchesOrden = ordenMin === null || Number(item.orden_display ?? 0) >= ordenMin;

      return matchesText && matchesDescripcion && matchesOrden;
    });
  }

  function renderTotals(filteredCount) {
    const totalCount = allCategorias.length;
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
    if (!items.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No hay categorías cargadas.</td>
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
            <td>${item.orden_display}</td>
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
      button.addEventListener("click", () => deleteCategoria(button.dataset.id));
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const id = idInput.value;
    const payload = {
      nombre: nombreInput.value.trim(),
      descripcion: descripcionInput.value.trim() || null,
      orden_display: Number(ordenInput.value || 0),
    };

    if (!payload.nombre) {
      setMessage("El nombre es obligatorio.", true);
      return;
    }

    const isEdit = Boolean(id);
    const endpoint = isEdit ? `/categorias/${id}` : "/categorias";
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
        throw new Error(result.detail || "No se pudo guardar la categoría.");
      }

      hideForm();
      setMessage(isEdit ? "Categoría actualizada." : "Categoría creada.");
      loadCategorias();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  async function deleteCategoria(id) {
    if (!window.confirm("¿Querés dar de baja esta categoría?")) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/categorias/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "No se pudo dar de baja la categoría.");
      }

      setMessage("Categoría dada de baja.");
      loadCategorias();
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