from sqlmodel import Session


def aplicar_stock(session: Session, producto_id: int, cantidad: int, multiplicador: int = 1) -> None:
    """Aplica cambio de stock a un producto.
    multiplicador=1: deducir (restar)
    multiplicador=-1: restaurar (sumar)
    """
    from app.modules.productos.repository import ProductoRepository

    producto_repo = ProductoRepository(session)
    producto = producto_repo.get_by_id(producto_id)
    if not producto:
        return

    if producto.stock_manual is not None:
        producto.stock_manual -= multiplicador * cantidad
        session.add(producto)
    else:
        ingredientes = list(producto.productos_ingredientes)
        if ingredientes:
            for pi in ingredientes:
                ing = pi.ingrediente
                if ing and ing.stock_actual > 0:
                    delta = float(pi.cantidad) * cantidad * multiplicador
                    ing.stock_actual = max(0, ing.stock_actual - delta)
                    session.add(ing)


def descontar_stock_pedido(session: Session, pedido_id: int, multiplicador: int = 1) -> None:
    """Descuenta o restaura stock de todos los productos de un pedido."""
    from app.modules.pedidos.detalle_pedido_repository import DetallePedidoRepository

    detalle_repo = DetallePedidoRepository(session)
    detalles = detalle_repo.get_by_pedido_id(pedido_id)
    for detalle in detalles:
        aplicar_stock(session, detalle.producto_id, detalle.cantidad, multiplicador)
