# app/main.py — Punto de entrada de la aplicación FastAPI
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.database import create_all_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas en la BD al iniciar la aplicación
    try:
        create_all_tables()
    except Exception:
        pass
    yield


# Orígenes permitidos para CORS
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]


class CORSMiddlewareManual(BaseHTTPMiddleware):
    # Middleware manual para CORS sin depender de starlette.middleware.cors
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)
        origin = request.headers.get("origin", "")
        if origin in cors_origins or "*" in cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["ngrok-skip-browser-warning"] = "true"
        return response


# Instancia principal de la aplicación FastAPI
app = FastAPI(
    title="Implementacion MP FastAPI",
    description="API de referencia para integración con MercadoPago",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(CORSMiddlewareManual)


@app.get("/health")
def health():
    # Endpoint de health check para verificar que la API responde
    return {"status": "ok", "version": "1.0.0"}


# Importación tardía (después de crear `app`) para evitar circular imports
from app.modules.products.router import router as products_router
from app.modules.orders.router import router as orders_router
from app.modules.payments.router import router as payments_router

# Registro de los routers de cada módulo
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(payments_router)
