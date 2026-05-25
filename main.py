from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_db_and_tables
from app.core.rbac import ROLE_ADMIN, ROLE_CLIENT, ROLE_PEDIDOS, ROLE_STOCK
from app.core.security import hash_password
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
    from sqlalchemy import text
    from app.core.database import engine
    from app.models import Rol, EstadoPedido, FormaPago, Usuario, UsuarioRol
    
    session = Session(engine)
    
    try:
        legacy_cliente = session.exec(select(Rol).where(Rol.codigo == "CLIENTE")).first()
        client_role = session.exec(select(Rol).where(Rol.codigo == ROLE_CLIENT)).first()
        if legacy_cliente and client_role is None:
            session.execute(text("UPDATE roles SET nombre = 'Cliente Legacy' WHERE codigo = 'CLIENTE'"))
            session.add(Rol(codigo=ROLE_CLIENT, nombre="Cliente", descripcion="Usuario cliente de la tienda"))
            session.flush()
            session.execute(text("UPDATE usuarios_roles SET rol_codigo = 'CLIENT' WHERE rol_codigo = 'CLIENTE'"))
            session.flush()

        # Inicializar roles
        roles = [
            (ROLE_ADMIN, "Administrador", "Acceso total al sistema"),
            (ROLE_STOCK, "Stock", "Gestión de stock y disponibilidad"),
            (ROLE_PEDIDOS, "Pedidos", "Gestión operativa de pedidos"),
            (ROLE_CLIENT, "Cliente", "Usuario cliente de la tienda"),
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
            ("EN_PREP", "En Preparación", "Pedido en preparación"),
            ("EN_CAMINO", "En Camino", "Pedido en envío"),
            ("ENTREGADO", "Entregado", "Pedido entregado al cliente"),
            ("CANCELADO", "Cancelado", "Pedido cancelado"),
        ]
        
        for codigo, nombre, descripcion in estados:
            existing = session.exec(select(EstadoPedido).where(EstadoPedido.codigo == codigo)).first()
            if not existing:
                estado = EstadoPedido(codigo=codigo, nombre=nombre, descripcion=descripcion)
                session.add(estado)

        formas_pago = [
            ("EFECTIVO", "Efectivo", "Pago en efectivo"),
            ("TARJETA", "Tarjeta", "Pago con tarjeta"),
            ("TRANSFERENCIA", "Transferencia", "Pago por transferencia"),
        ]
        for codigo, nombre, descripcion in formas_pago:
            existing = session.exec(select(FormaPago).where(FormaPago.codigo == codigo)).first()
            if not existing:
                session.add(FormaPago(codigo=codigo, nombre=nombre, descripcion=descripcion))

        estado_preparando = session.exec(select(EstadoPedido).where(EstadoPedido.codigo == "PREPARANDO")).first()
        if estado_preparando:
            session.execute(
                text("UPDATE pedidos SET estado_codigo = 'EN_PREP' WHERE estado_codigo = 'PREPARANDO'")
            )
            session.execute(
                text("UPDATE historiales_estado_pedido SET estado_desde_codigo = 'EN_PREP' WHERE estado_desde_codigo = 'PREPARANDO'")
            )
            session.execute(
                text("UPDATE historiales_estado_pedido SET estado_hacia_codigo = 'EN_PREP' WHERE estado_hacia_codigo = 'PREPARANDO'")
            )
            session.delete(estado_preparando)

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
                    UsuarioRol.rol_codigo == ROLE_ADMIN,
                )
            ).first()
            if not admin_role_link:
                session.add(UsuarioRol(usuario_id=admin_user.id, rol_codigo=ROLE_ADMIN))

        # Garantizar que stock@test.com tenga rol STOCK
        stock_user = session.exec(
            select(Usuario).where(
                Usuario.email == "stock@test.com",
                Usuario.deleted_at.is_(None),
            )
        ).first()
        if not stock_user:
            stock_user = Usuario(
                nombre="Stock",
                apellido="Test",
                email="stock@test.com",
                celular="1111111111",
                password_hash=hash_password("stock123"),
                activo=True,
            )
            session.add(stock_user)
            session.flush()
        stock_role_link = session.exec(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == stock_user.id,
                UsuarioRol.rol_codigo == ROLE_STOCK,
            )
        ).first()
        if not stock_role_link:
            session.add(UsuarioRol(usuario_id=stock_user.id, rol_codigo=ROLE_STOCK))

        # Garantizar que pedidos@test.com tenga rol PEDIDOS
        pedidos_user = session.exec(
            select(Usuario).where(
                Usuario.email == "pedidos@test.com",
                Usuario.deleted_at.is_(None),
            )
        ).first()
        if not pedidos_user:
            pedidos_user = Usuario(
                nombre="Pedidos",
                apellido="Test",
                email="pedidos@test.com",
                celular="2222222222",
                password_hash=hash_password("pedidos123"),
                activo=True,
            )
            session.add(pedidos_user)
            session.flush()
        pedidos_role_link = session.exec(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == pedidos_user.id,
                UsuarioRol.rol_codigo == ROLE_PEDIDOS,
            )
        ).first()
        if not pedidos_role_link:
            session.add(UsuarioRol(usuario_id=pedidos_user.id, rol_codigo=ROLE_PEDIDOS))

        # Garantizar rol CLIENT para usuarios sin roles
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
                session.add(UsuarioRol(usuario_id=usuario.id, rol_codigo=ROLE_CLIENT))

        # Migra usuarios con rol legacy CLIENTE -> CLIENT
        legacy_links = session.exec(
            select(UsuarioRol).where(UsuarioRol.rol_codigo == "CLIENTE")
        ).all()
        for legacy_link in legacy_links:
            session.delete(legacy_link)
            existing_client = session.exec(
                select(UsuarioRol).where(
                    UsuarioRol.usuario_id == legacy_link.usuario_id,
                    UsuarioRol.rol_codigo == ROLE_CLIENT,
                )
            ).first()
            if not existing_client:
                session.add(UsuarioRol(usuario_id=legacy_link.usuario_id, rol_codigo=ROLE_CLIENT))

        legacy_cliente = session.exec(select(Rol).where(Rol.codigo == "CLIENTE")).first()
        if legacy_cliente:
            session.delete(legacy_cliente)
        
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
    redirect_slashes=False,
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


@app.get("/", tags=["health"])
def root():
    return {
        "message": "Food Store API is running",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
