# Implementación MP FastAPI — E-commerce con MercadoPago

Proyecto de referencia que integra **MercadoPago** como gateway de pagos en un e-commerce simple, usando **FastAPI** + **PostgreSQL** + **React 19**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.11+, FastAPI, SQLModel, SQLAlchemy, psycopg2 |
| Base de datos | PostgreSQL |
| Pagos | SDK oficial `mercadopago` (redirect puro, sin Checkout Pro frontend) |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS v4, Zustand 5, React Router 7 |

## Estructura del proyecto

```
implementacion-mp-fastapi/
├── backend/
│   └── app/
│       ├── core/                    # Configuración transversal
│       │   ├── config.py            # Settings vía .env (pydantic-settings)
│       │   ├── database.py          # Engine, session, create_all_tables
│       │   ├── base_repository.py   # BaseRepository[T] genérico (CRUD)
│       │   └── unit_of_work.py      # UnitOfWork genérico (context manager)
│       ├── db/
│       │   └── seed.py              # Seed: 5 productos + 1 pedido de prueba
│       ├── modules/
│       │   ├── products/            # Catálogo de productos
│       │   ├── orders/              # Pedidos
│       │   └── payments/            # Pagos (integración MercadoPago)
│       └── main.py                  # App FastAPI, lifespan, CORS, routers
├── frontend/                        # SPA React 19 + Zustand
│   └── src/
│       ├── api.ts                   # Axios instance con baseURL
│       ├── stores/                  # Zustand stores
│       ├── components/              # Componentes reutilizables
│       ├── pages/                   # Páginas (Products, Cart, Payment, Success)
│       └── App.tsx                  # Router principal
└── README.md
```

## Patrón arquitectónico (backend)

Cada módulo sigue la misma estructura:

```
modules/<name>/
├── models.py        # SQLModel (tabla)
├── schemas.py       # Pydantic models (request/response)
├── repository.py    # Acceso a datos (hereda de BaseRepository)
├── unit_of_work.py  # UnitOfWork del módulo
├── service.py       # Lógica de negocio
└── router.py        # Endpoints FastAPI
```

- `BaseRepository[T]` inyecta la session y ofrece `get_by_id`, `get_all`, `add`, `update`, `delete`.
- `UnitOfWork` se usa con `with ModuleUoW(self._session) as uow:` para commit/rollback automático.
- El Service recibe la session por constructor y crea UoW internamente.

## Endpoints

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/productos/` | Lista todos los productos activos |
| GET | `/api/v1/productos/{id}` | Detalle de un producto |

### Pedidos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/pedidos/` | Crear un pedido (con items + total) |
| GET | `/api/v1/pedidos/{id}` | Obtener detalle del pedido |

### Pagos (MercadoPago)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/pagos/create-preference` | Crea preferencia MP y devuelve `init_point` |
| POST | `/api/v1/pagos/webhook` | Webhook IPN (acepta JSON, form, query params) |
| POST | `/api/v1/pagos/confirm` | Confirma pago post-redirect, consulta estado real en MP |
| GET | `/api/v1/pagos/redirect/{pedido_id}/{status}` | Redirige al frontend con query params |

### Health
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |

## Flujo de pago

1. Usuario agrega productos al carrito (Zustand + localStorage)
2. En el carrito crea un `Pedido` (POST /pedidos)
3. Se muestra la orden → botón "Pagar" → POST /pagos/create-preference
4. El backend crea una preferencia en MP y devuelve `init_point`
5. Frontend redirige a `init_point` (MercadoPago sandbox)
6. MP redirige al back (`/redirect`) que reenvía al frontend (`/orders/{id}/success|failure`)
7. Frontend llama POST `/pagos/confirm` para verificar el estado real contra la API de MP
8. El webhook IPN actúa como respaldo asíncrono

> **Importante**: `_consultar_pago_mp()` en PaymentService **siempre** consulta el estado real en la API de MercadoPago.
> Nunca confía ciegamente en los datos del redirect o webhook.

## Configuración rápida

### 1. PostgreSQL

Crear la base de datos:

```sql
CREATE DATABASE foodstore_simple;
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt

cp .env.example .env       # Editar con tus credenciales
python -m app.db.seed       # Poblar tabla productos
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva en: http://localhost:8000/docs

### 3. Ngrok (túnel HTTPS para webhook)

Ngrok expone tu localhost con una URL pública HTTPS. Es **necesaria** porque MercadoPago:
- Exige HTTPS en las `back_urls` de la preferencia (redirect post-pago)
- Envía notificaciones IPN a una URL pública (webhook)

```bash
# 1. Descargar de https://ngrok.com/download
# 2. Extraer en C:\ngrok\ (o donde prefieras)
# 3. Agregar al PATH o ejecutar desde ahí

ngrok http 8000
```

Te da una URL tipo `https://abc123.ngrok-free.app`. Esa URL va en `backend/.env`:

```ini
NGROK_URL=https://abc123.ngrok-free.app
MP_WEBHOOK_URL=https://abc123.ngrok-free.app/api/v1/pagos/webhook
```

Dejá ngrok corriendo en una terminal aparte mientras desarrollás.

### 4. Frontend

```bash
cd frontend
pnpm i
cp .env.example .env
pnpm dev
```

Abrir http://localhost:5173

## Variables de entorno

### Backend (`.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL | `postgres` |
| `POSTGRES_DB` | Nombre de la base de datos | `foodstore_simple` |
| `POSTGRES_HOST` | Host PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Puerto PostgreSQL | `5432` |
| `MP_ACCESS_TOKEN` | Access Token de MercadoPago (TEST) | — |
| `MP_PUBLIC_KEY` | Public Key de MercadoPago (TEST) | — |
| `MP_WEBHOOK_URL` | URL del webhook (ngrok) | — |
| `NGROK_URL` | URL pública de ngrok para back_urls HTTPS | — |
| `CORS_ORIGINS` | Orígenes CORS (separados por coma) | `http://localhost:5173` |
| `VITE_FRONTEND_URL` | URL del frontend | `http://localhost:5173` |
| `VITE_API_URL` | URL del backend | `http://localhost:8000` |

### Frontend (`.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend (sin `/api`) |
| `VITE_MP_PUBLIC_KEY` | Public Key de MercadoPago |

## Notas importantes

- La tabla `pagos` usa `BigInteger` para `mp_payment_id` porque MP genera IDs numéricos grandes que no entran en un `Integer` estándar de SQLAlchemy.
- El webhook **siempre** responde HTTP 200, incluso si hay error interno. MP bloquea IPs que devuelven 4xx/5xx.
- Se usa `idempotency_key` (UUID) por cada intento de pago para prevenir duplicados.
- Ngrok puede perder query params en redirects → el endpoint `/confirm` resuelve `payment_id` desde el body y del query string.
- Si ngrok se detiene, se genera una nueva URL. Actualizá `NGROK_URL` y `MP_WEBHOOK_URL` en `.env` y reiniciá el backend.
- No es necesario crear una cuenta gratuita de ngrok para desarrollo — el plan free (`ngrok http 8000`) funciona sin registro.
