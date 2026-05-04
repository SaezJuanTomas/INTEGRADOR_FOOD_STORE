document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const form = document.getElementById("productoForm");
  const newButton = document.getElementById("newProductoBtn");
  const cancelButton = document.getElementById("cancelProductoBtn");
  const message = document.getElementById("productosMessage");
  const tableBody = document.getElementById("productosTableBody");
  const totalLabel = document.getElementById("productosTotalLabel");
  const filteredLabel = document.getElementById("productosFilteredLabel");
  const prevPageButton = document.getElementById("productosPrevPageBtn");
  const nextPageButton = document.getElementById("productosNextPageBtn");
  const pageInfo = document.getElementById("productosPageInfo");
  const filterTextInput = document.getElementById("productoFilterText");
  const filterCategoriaInput = document.getElementById("productoFilterCategoria");
  const filterDisponibleInput = document.getElementById("productoFilterDisponible");
  const resetFiltersButton = document.getElementById("productoResetFiltersBtn");

  const idInput = document.getElementById("productoId");
  const nombreInput = document.getElementById("productoNombre");
  const descripcionInput = document.getElementById("productoDescripcion");
  const precioInput = document.getElementById("productoPrecio");
  const imagenInput = document.getElementById("productoImagen");
  const tiempoInput = document.getElementById("productoTiempo");
  const categoriaIdInput = document.getElementById("productoCategoriaId");
  const ingredientesIdsInput = document.getElementById("productoIngredientesIds");
  const disponibleInput = document.getElementById("productoDisponible");
  const pageSize = 8;

  let allProductos = [];
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

  if (filterCategoriaInput) {
    filterCategoriaInput.addEventListener("input", () => updateView(true));
  }

  if (filterDisponibleInput) {
    filterDisponibleInput.addEventListener("change", () => updateView(true));
  }

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
      filterTextInput.value = "";
      filterCategoriaInput.value = "";
      filterDisponibleInput.value = "all";
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

  loadProductos();

  function setMessage(text, isError = false) {
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
      precioInput.value = data.precio_base ?? "";
      imagenInput.value = data.imagenes_url || "";
      tiempoInput.value = data.tiempo_prep_min ?? "";
      categoriaIdInput.value = data.categoria_id ?? "";
      ingredientesIdsInput.value = (data.ingrediente_ids || []).join(",");
      disponibleInput.checked = Boolean(data.disponible);
    } else {
      form.reset();
      idInput.value = "";
      disponibleInput.checked = true;
    }

    nombreInput.focus();
  }

  function hideForm() {
    form.reset();
    idInput.value = "";
    disponibleInput.checked = true;
    form.classList.add("hidden");
    setMessage("");
  }

  async function loadProductos() {
    setMessage("Cargando productos...");

    try {
      const response = await fetch(getApiUrl("/productos?offset=0&limit=100"), {
        headers: authHeaders(),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || "No se pudieron cargar los productos.");
      }

      allProductos = payload.data || [];
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

    const filteredItems = filterProductos(allProductos);
    const totalPages = FOOD_STORE_LIST.getPageCount(filteredItems.length, pageSize);
    currentPage = FOOD_STORE_LIST.clampPage(currentPage, totalPages);
    const pageItems = totalPages === 0 ? [] : FOOD_STORE_LIST.getPageItems(filteredItems, currentPage, pageSize);

    renderTable(pageItems);
    renderPagination(filteredItems.length, totalPages);
    renderTotals(filteredItems.length);
  }

  function filterProductos(items) {
    const textQuery = filterTextInput?.value || "";
    const categoriaQuery = filterCategoriaInput?.value.trim() || "";
    const disponibleQuery = filterDisponibleInput?.value || "all";

    return items.filter((item) => {
      const matchesText =
        FOOD_STORE_LIST.matches(item.nombre, textQuery) ||
        FOOD_STORE_LIST.matches(item.descripcion, textQuery) ||
        FOOD_STORE_LIST.matches(item.id, textQuery) ||
        FOOD_STORE_LIST.matches(item.categoria_id, textQuery);

      const matchesCategoria = !categoriaQuery || String(item.categoria_id ?? "") === categoriaQuery;
      const matchesDisponible =
        disponibleQuery === "all" ||
        (disponibleQuery === "yes" ? Boolean(item.disponible) : !Boolean(item.disponible));

      return matchesText && matchesCategoria && matchesDisponible;
    });
  }

  function renderTotals(filteredCount) {
    const totalCount = allProductos.length;
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
      if (filteredCount === 0) {
        pageInfo.textContent = "Sin resultados.";
      } else {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
      }
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
          <td colspan="7">No hay productos cargados.</td>
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
            <td>$${item.precio_base}</td>
            <td>${item.categoria_id ?? "-"}</td>
            <td>${item.disponible ? "Sí" : "No"}</td>
            <td>${(item.ingrediente_ids || []).join(", ") || "-"}</td>
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
      button.addEventListener("click", () => deleteProducto(button.dataset.id));
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const id = idInput.value;
    const payload = {
      nombre: nombreInput.value.trim(),
      descripcion: descripcionInput.value.trim() || null,
      precio_base: Number(precioInput.value || 0),
      imagenes_url: imagenInput.value.trim() || null,
      tiempo_prep_min: tiempoInput.value ? Number(tiempoInput.value) : null,
      disponible: disponibleInput.checked,
      categoria_id: categoriaIdInput.value ? Number(categoriaIdInput.value) : null,
      ingrediente_ids: parseIds(ingredientesIdsInput.value),
    };

    if (!payload.nombre) {
      setMessage("El nombre es obligatorio.", true);
      return;
    }

    const isEdit = Boolean(id);
    const endpoint = isEdit ? `/productos/${id}` : "/productos";
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
        throw new Error(result.detail || "No se pudo guardar el producto.");
      }

      hideForm();
      setMessage(isEdit ? "Producto actualizado." : "Producto creado.");
      loadProductos();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  async function deleteProducto(id) {
    if (!window.confirm("¿Querés dar de baja este producto?")) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/productos/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "No se pudo dar de baja el producto.");
      }

      setMessage("Producto dado de baja.");
      loadProductos();
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function parseIds(rawValue) {
    return rawValue
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
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