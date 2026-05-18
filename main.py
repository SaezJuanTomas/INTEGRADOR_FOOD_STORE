from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_db_and_tables
from app.modules.auth.router import router as auth_router
from app.modules.usuarios.router import router as usuarios_router
from app.modules.categorias.router import router as categorias_router
from app.modules.ingredientes.router import router as ingredientes_router
from app.modules.productos.router import router as productos_router
from app.modules.pedidos.router import router as pedidos_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    _initialize_roles_and_states()
    yield


def _initialize_roles_and_states():
    """Inicializar roles y estados de pedido si no existen."""
    from sqlmodel import Session, select
    from app.core.database import engine
    from app.models import Rol, EstadoPedido, Usuario, UsuarioRol
    
    session = Session(engine)
    
    try:
        # Inicializar roles
        roles = [
            ("ADMIN", "Administrador", "Usuario con acceso total al sistema"),
            ("CLIENTE", "Cliente", "Usuario cliente que puede hacer pedidos"),
        ]
        
        for codigo, nombre, descripcion in roles:
            existing = session.exec(select(Rol).where(Rol.codigo == codigo)).first()
            if not existing:
                rol = Rol(codigo=codigo, nombre=nombre, descripcion=descripcion)
                session.add(rol)
        
        # Inicializar estados de pedido
        estados = [
            ("PENDIENTE", "Pendiente", "Pedido creado, aguardando confirmación"),
            ("CONFIRMADO", "Confirmado", "Pedido confirmado, se descantó stock"),
            ("PREPARANDO", "Preparando", "Pedido en preparación"),
            ("EN_CAMINO", "En Camino", "Pedido en envío"),
            ("ENTREGADO", "Entregado", "Pedido entregado al cliente"),
            ("CANCELADO", "Cancelado", "Pedido cancelado"),
        ]
        
        for codigo, nombre, descripcion in estados:
            existing = session.exec(select(EstadoPedido).where(EstadoPedido.codigo == codigo)).first()
            if not existing:
                estado = EstadoPedido(codigo=codigo, nombre=nombre, descripcion=descripcion)
                session.add(estado)

        # Garantizar que admin@test.com tenga rol ADMIN
        admin_user = session.exec(
            select(Usuario).where(
                Usuario.email == "admin@test.com",
                Usuario.deleted_at.is_(None),
            )
        ).first()
        if admin_user:
            admin_role_link = session.exec(
                select(UsuarioRol).where(
                    UsuarioRol.usuario_id == admin_user.id,
                    UsuarioRol.rol_codigo == "ADMIN",
                )
            ).first()
            if not admin_role_link:
                session.add(UsuarioRol(usuario_id=admin_user.id, rol_codigo="ADMIN"))

        # Garantizar rol CLIENTE para usuarios sin roles
        usuarios = session.exec(
            select(Usuario).where(
                Usuario.deleted_at.is_(None),
                Usuario.activo.is_(True),
            )
        ).all()
        for usuario in usuarios:
            has_any_role = session.exec(
                select(UsuarioRol).where(UsuarioRol.usuario_id == usuario.id)
            ).first()
            if not has_any_role:
                session.add(UsuarioRol(usuario_id=usuario.id, rol_codigo="CLIENTE"))
        
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Error initializing roles and states: {e}")
    finally:
        session.close()


app = FastAPI(
    title="Food Store API",
    description="Backend de Programacion 4 - Tienda de Comida",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5500",
        "http://localhost:5501",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        # Vite dev server (frontend)
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers de autenticación y usuarios
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(usuarios_router, prefix="/usuarios", tags=["usuarios"])

# Routers de catálogo
app.include_router(categorias_router, prefix="/categorias", tags=["categorias"])
app.include_router(productos_router, prefix="/productos", tags=["productos"])
app.include_router(ingredientes_router, prefix="/ingredientes", tags=["ingredientes"])

# Router de pedidos
app.include_router(pedidos_router, prefix="/pedidos", tags=["pedidos"])
