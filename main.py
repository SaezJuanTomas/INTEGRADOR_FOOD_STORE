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
from app.modules.payments.router import router as pagos_router


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
    from app.models import Rol, EstadoPedido, FormaPago, Usuario, UsuarioRol, Categoria, Producto, ProductoCategoria, Ingrediente, ProductoIngrediente
    from app.models.producto_ingrediente import UnidadEnum
    
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
            ("PAGADO", "Pagado", "Pedido pagado vía MercadoPago"),
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
        if not admin_user:
            admin_user = Usuario(
                nombre="Admin",
                apellido="Test",
                email="admin@test.com",
                celular="3333333333",
                password_hash=hash_password("admin123"),
                activo=True,
            )
            session.add(admin_user)
            session.flush()
        admin_role_link = session.exec(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == admin_user.id,
                UsuarioRol.rol_codigo == ROLE_ADMIN,
            )
        ).first()
        if not admin_role_link:
            session.add(UsuarioRol(usuario_id=admin_user.id, rol_codigo=ROLE_ADMIN))

        # Garantizar que cliente@test.com tenga rol CLIENT
        cliente_user = session.exec(
            select(Usuario).where(
                Usuario.email == "cliente@test.com",
                Usuario.deleted_at.is_(None),
            )
        ).first()
        if not cliente_user:
            cliente_user = Usuario(
                nombre="Cliente",
                apellido="Test",
                email="cliente@test.com",
                celular="4444444444",
                password_hash=hash_password("cliente123"),
                activo=True,
            )
            session.add(cliente_user)
            session.flush()
        cliente_role_link = session.exec(
            select(UsuarioRol).where(
                UsuarioRol.usuario_id == cliente_user.id,
                UsuarioRol.rol_codigo == ROLE_CLIENT,
            )
        ).first()
        if not cliente_role_link:
            session.add(UsuarioRol(usuario_id=cliente_user.id, rol_codigo=ROLE_CLIENT))

        # Seed de datos de ejemplo (solo si no hay categorías)
        categorias_existentes = session.exec(select(Categoria).limit(1)).first()
        if not categorias_existentes:
            from decimal import Decimal
            cat_pizzas = Categoria(nombre="Pizzas", descripcion="Pizzas clásicas y especiales", orden_display=1)
            cat_bebidas = Categoria(nombre="Bebidas", descripcion="Gaseosas, aguas y más", orden_display=2)
            cat_adicionales = Categoria(nombre="Adicionales", descripcion="Porciones, fainá, etc.", orden_display=3)
            session.add_all([cat_pizzas, cat_bebidas, cat_adicionales])
            session.flush()

            prod_muzza = Producto(nombre="Muzza", descripcion="Pizza de mozzarella", precio_base=Decimal("1500"), stock_manual=50, disponible=True, usa_stock_manual=True)
            prod_napo = Producto(nombre="Napolitana", descripcion="Pizza napolitana con rodajas de tomate", precio_base=Decimal("1800"), stock_manual=40, disponible=True, usa_stock_manual=True)
            prod_faina = Producto(nombre="Fainá", descripcion="Porción de fainá", precio_base=Decimal("500"), stock_manual=60, disponible=True, usa_stock_manual=True)
            prod_coca = Producto(nombre="Coca Cola 1.5L", descripcion="Gaseosa Coca Cola 1.5 litros", precio_base=Decimal("1200"), stock_manual=100, disponible=True, usa_stock_manual=True)
            prod_agua = Producto(nombre="Agua mineral 500ml", descripcion="Agua mineral sin gas", precio_base=Decimal("400"), stock_manual=100, disponible=True, usa_stock_manual=True)
            session.add_all([prod_muzza, prod_napo, prod_faina, prod_coca, prod_agua])
            session.flush()

            session.add(ProductoCategoria(producto_id=prod_muzza.id, categoria_id=cat_pizzas.id, es_principal=True))
            session.add(ProductoCategoria(producto_id=prod_napo.id, categoria_id=cat_pizzas.id, es_principal=True))
            session.add(ProductoCategoria(producto_id=prod_faina.id, categoria_id=cat_adicionales.id, es_principal=True))
            session.add(ProductoCategoria(producto_id=prod_coca.id, categoria_id=cat_bebidas.id, es_principal=True))
            session.add(ProductoCategoria(producto_id=prod_agua.id, categoria_id=cat_bebidas.id, es_principal=True))

            ingrediente_muzza = Ingrediente(nombre="Mozzarella", descripcion="Queso mozzarella", es_alergeno=False, stock_actual=10, stock_minimo=2, costo_unitario=Decimal("200"), unidad_medida=UnidadEnum.GRAMOS)
            ingrediente_aceite = Ingrediente(nombre="Aceite de oliva", descripcion="Aceite de oliva extra virgen", es_alergeno=False, stock_actual=5, stock_minimo=1, costo_unitario=Decimal("150"), unidad_medida=UnidadEnum.LITROS)
            session.add_all([ingrediente_muzza, ingrediente_aceite])
            session.flush()

            session.add(ProductoIngrediente(producto_id=prod_muzza.id, ingrediente_id=ingrediente_muzza.id, cantidad=200, unidad=UnidadEnum.GRAMOS, es_removible=False))
            session.add(ProductoIngrediente(producto_id=prod_napo.id, ingrediente_id=ingrediente_muzza.id, cantidad=180, unidad=UnidadEnum.GRAMOS, es_removible=False))
            session.add(ProductoIngrediente(producto_id=prod_napo.id, ingrediente_id=ingrediente_aceite.id, cantidad=0.05, unidad=UnidadEnum.LITROS, es_removible=True))

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

# Router de pagos (MercadoPago)
app.include_router(pagos_router)


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
