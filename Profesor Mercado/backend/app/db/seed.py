# app/db/seed.py — Poblado inicial de la base de datos con datos de prueba
from sqlmodel import SQLModel, Session

from app.core.database import engine
from app.modules.products.models import Producto
from app.modules.orders.models import Pedido


# Datos de ejemplo para productos del catálogo
PRODUCTOS = [
    {"nombre": "Hamburguesa Clásica",
     "descripcion": "Hamburguesa angus 200g con lechuga, tomate y cebolla",
     "precio": 4500.00,
     "imagen_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"},
    {"nombre": "Pizza Mozzarella",
     "descripcion": "Mozzarella fresca con salsa de tomate casera y albahaca",
     "precio": 3800.00,
     "imagen_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400"},
    {"nombre": "Papas Fritas Cheddar",
     "descripcion": "Papas crujientes con cheddar fundido y panceta",
     "precio": 2800.00,
     "imagen_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400"},
    {"nombre": "Ensalada Caesar",
     "descripcion": "Lechuga romana, crutones, parmesano y pollo grillé",
     "precio": 3200.00,
     "imagen_url": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400"},
    {"nombre": "Milanesa Napolitana",
     "descripcion": "Milanesa de carne con salsa de tomate, mozzarella y jamón",
     "precio": 4200.00,
     "imagen_url": "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400"},
]


def run_seed():
    # Crea las tablas si no existen y popula con datos iniciales
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Evita duplicar datos si ya se ejecutó el seed antes
        if session.query(Producto).count() > 0:
            print("Ya hay productos. Se saltea el seed.")
            return

        for data in PRODUCTOS:
            session.add(Producto(**data))

        session.add(Pedido(total=4500.00, estado="pendiente"))
        session.commit()
        print(f"✓ {len(PRODUCTOS)} productos + 1 pedido de prueba creados.")


if __name__ == "__main__":
    run_seed()
