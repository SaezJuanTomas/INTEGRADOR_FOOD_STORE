document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("page-shell")) {
    return;
  }

  if (document.querySelector(".burger-trigger")) {
    return;
  }

  const trigger = document.createElement("button");
  trigger.className = "burger-trigger button button-secondary";
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "burgerDrawer");
  trigger.innerHTML = '<span class="burger-icon" aria-hidden="true">☰</span><span>Menú</span>';

  const drawer = document.createElement("aside");
  drawer.className = "burger-drawer";
  drawer.id = "burgerDrawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="burger-drawer-header">
      <strong>Food Store</strong>
      <button class="burger-close" type="button" aria-label="Cerrar menú">×</button>
    </div>
    <nav class="burger-links" aria-label="Navegación principal">
      <a class="menu-link" href="../index.html">Inicio</a>
      <a class="menu-link" href="menu.html">Menú</a>
      <a class="menu-link" href="productos.html">Productos</a>
      <a class="menu-link" href="ingredientes.html">Ingredientes</a>
      <a class="menu-link" href="categorias.html">Categorías</a>
    </nav>
    <div class="burger-footer">
      <button class="menu-link danger-link" type="button" data-burger-logout>Logout</button>
    </div>
  `;

  const backdrop = document.createElement("div");
  backdrop.className = "burger-backdrop hidden";
  backdrop.setAttribute("data-burger-backdrop", "true");

  const headerActions = document.querySelector(".page-header .header-actions");
  const pageHeader = document.querySelector(".page-header");
  const menuCard = document.querySelector(".menu-card");

  if (headerActions) {
    headerActions.prepend(trigger);
  } else if (pageHeader) {
    const headerRow = document.createElement("div");
    headerRow.className = "header-actions";
    headerRow.appendChild(trigger);
    pageHeader.prepend(headerRow);
  } else if (menuCard) {
    const topBar = document.createElement("div");
    topBar.className = "header-actions burger-header-row";
    topBar.appendChild(trigger);
    menuCard.insertBefore(topBar, menuCard.firstChild);
  } else {
    document.body.prepend(trigger);
  }

  document.body.append(backdrop, drawer);

  const closeButton = drawer.querySelector(".burger-close");
  const logoutButton = drawer.querySelector("[data-burger-logout]");

  function setOpen(isOpen) {
    trigger.setAttribute("aria-expanded", String(isOpen));
    drawer.classList.toggle("is-open", isOpen);
    drawer.setAttribute("aria-hidden", String(!isOpen));
    backdrop.classList.toggle("hidden", !isOpen);
  }

  trigger.addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));
  closeButton.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  if (logoutButton && typeof clearSession === "function") {
    logoutButton.addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  } else if (logoutButton) {
    logoutButton.classList.add("hidden");
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
});