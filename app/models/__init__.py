"""
Modelos de la aplicación.
Importar en orden: tablas intermedias → Categoria → Producto → Ingrediente.
"""

# Tablas intermedias (sin dependencias circulares internas)
from app.models.producto_categoria import ProductoCategoria  # noqa: F401
from app.models.ingrediente import ProductoIngrediente, Ingrediente  # noqa: F401

# Entidades principales (dependen de tablas intermedias)
from app.models.categoria import Categoria  # noqa: F401
from app.models.producto import Producto  # noqa: F401

__all__ = [
    "Categoria",
    "Producto",
    "Ingrediente",
    "ProductoCategoria",
    "ProductoIngrediente",
]
