#!/usr/bin/env python3
"""
Script de prueba rápida para validar la arquitectura del backend.
Crea BD de prueba, inserta dados, verifica transacciones.
"""

import sys
from contextlib import contextmanager

from sqlmodel import Session, create_engine, SQLModel

from app.core.config import settings
from app.models import Categoria, Producto, Ingrediente, ProductoCategoria, ProductoIngrediente
from app.modules.categorias.service import CategoriaService
from app.modules.productos.service import ProductoService
from app.modules.ingredientes.service import IngredienteService
from app.modules.categorias.schemas import CategoriaCreate
from app.modules.ingredientes.schemas import IngredienteCreate
from app.modules.productos.schemas import ProductoCreate
from decimal import Decimal


def main():
    print("\n" + "=" * 60)
    print("PRUEBA DE ARQUITECTURA - Food Store Backend")
    print("=" * 60)

    # Crear BD de prueba en SQLite (en memoria)
    test_db_url = "sqlite:///:memory:"
    engine = create_engine(test_db_url, echo=False)
    SQLModel.metadata.create_all(engine)

    print("\n✓ Base de datos de prueba creada")

    with Session(engine) as session:
        # Crear servicios
        cat_svc = CategoriaService(session)
        ing_svc = IngredienteService(session)
        prod_svc = ProductoService(session)

        print("✓ Servicios inicializados")

        # Test 1: Crear categoria
        print("\n--- Test 1: Crear Categoría ---")
        cat_data = CategoriaCreate(nombre="Pizzas", descripcion="Pizzas variadas", orden_display=1)
        cat = cat_svc.create(cat_data)
        print(f"  ✓ Categoría creada: {cat.nombre} (ID: {cat.id})")

        # Test 2: Crear ingredientes
        print("\n--- Test 2: Crear Ingredientes ---")
        ing1_data = IngredienteCreate(nombre="Queso Mozzarella", es_alergeno=False)
        ing1 = ing_svc.create(ing1_data)
        print(f"  ✓ Ingrediente 1: {ing1.nombre} (ID: {ing1.id})")

        ing2_data = IngredienteCreate(nombre="Huevo", es_alergeno=True)
        ing2 = ing_svc.create(ing2_data)
        print(f"  ✓ Ingrediente 2: {ing2.nombre} (ID: {ing2.id}) [ALERGENO]")

        # Test 3: Crear producto
        print("\n--- Test 3: Crear Producto ---")
        prod_data = ProductoCreate(
            nombre="Pizza 4 Quesos",
            descripcion="Con mozzarella, parmesano, azul y ricotta",
            precio_base=Decimal("15.99"),
            disponible=True,
            ingrediente_ids=[ing1.id],
        )
        prod = prod_svc.create(prod_data)
        print(f"  ✓ Producto creado: {prod.nombre} (ID: {prod.id})")
        print(f"    Precio: ${prod.precio_base}")
        print(f"    Ingredientes: {prod.ingrediente_ids}")

        # Test 4: Validar duplicados
        print("\n--- Test 4: Validar duplicados ---")
        try:
            cat_svc.create(CategoriaCreate(nombre="Pizzas", descripcion="Duplicate", orden_display=2))
            print("  ✗ FALLO: Debería rechazar nombre duplicado")
            sys.exit(1)
        except Exception as e:
            if "ya existe" in str(e):
                print(f"  ✓ Duplicado rechazado correctamente: {e}")
            else:
                raise

        # Test 5: Get by ID
        print("\n--- Test 5: Obtener por ID ---")
        cat_fetched = cat_svc.get_by_id(cat.id)
        print(f"  ✓ Categoría recuperada: {cat_fetched.nombre}")

        # Test 6: Update
        print("\n--- Test 6: Actualizar ---")
        from app.modules.categorias.schemas import CategoriaUpdate
        cat_svc.update(cat.id, CategoriaUpdate(descripcion="Pizzas italianas auténticas"))
        cat_updated = cat_svc.get_by_id(cat.id)
        print(f"  ✓ Descripción actualizada: {cat_updated.descripcion}")

        # Test 7: Soft Delete
        print("\n--- Test 7: Soft Delete ---")
        ing_svc.soft_delete(ing2.id)
        print(f"  ✓ Ingrediente {ing2.nombre} marcado como eliminado")

        print("\n" + "=" * 60)
        print("✓ TODOS LOS TESTS PASARON")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
