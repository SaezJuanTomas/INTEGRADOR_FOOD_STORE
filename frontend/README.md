# Food Store Frontend

Frontend simple en HTML, CSS y JavaScript puro para consumir la API de Food Store.

## Estructura

- `index.html`: portada simple con accesos al login y al menú.
- `pages/login.html`: formulario de acceso.
- `pages/menu.html`: menú principal.
- `pages/ingredientes.html`: CRUD de ingredientes.
- `pages/categorias.html`: CRUD de categorías.
- `pages/productos.html`: CRUD de productos.
- `css/styles.css`: estilos generales.
- `js/config.js`: URL base de la API, claves de `localStorage` y helpers compartidos.
- `js/auth.js`: lógica de login.
- `js/menu.js`: logout y protección del menú.
- `js/ingredientes.js`: listado, alta, edición y eliminación de ingredientes.
- `js/categorias.js`: CRUD completo de categorías.
- `js/productos.js`: CRUD completo de productos.

## Configuración

Si el endpoint de login del backend cambia, editá `js/config.js` y ajustá `loginEndpoint`.

El frontend incluye modo demo activado por defecto para desarrollo:

- Usuario: `admin`
- Contraseña: `admin123`

Este fallback se configura en `js/config.js` dentro de `demoAuth`.

## Uso

Abrí `frontend/index.html` en el navegador o servilo con un servidor estático simple.

## APIs consumidas

El frontend consume estos endpoints:

- `GET /ingredientes`
- `POST /ingredientes`
- `PATCH /ingredientes/{id}`
- `DELETE /ingredientes/{id}`
- `GET /categorias`
- `POST /categorias`
- `PATCH /categorias/{id}`
- `DELETE /categorias/{id}`
- `GET /productos`
- `POST /productos`
- `PATCH /productos/{id}`
- `DELETE /productos/{id}`
