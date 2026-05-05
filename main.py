from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_db_and_tables
from app.modules.auth.router import router as auth_router
from app.modules.categorias.router import router as categorias_router
from app.modules.ingredientes.router import router as ingredientes_router
from app.modules.productos.router import router as productos_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="Food Store API",
    description="Backend parcial Programacion 4",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5500",
        "http://localhost:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorias_router, prefix="/categorias", tags=["categorias"])
app.include_router(productos_router, prefix="/productos", tags=["productos"])
app.include_router(ingredientes_router, prefix="/ingredientes", tags=["ingredientes"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
