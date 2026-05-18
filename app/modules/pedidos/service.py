"""
PedidoService: Lógica de negocio para pedidos.
Maneja creación, confirmación, cancelación y cambios de estado.
"""

from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models import (
    Pedido,
    DetallePedido,
    HistorialEstadoPedido,
    EstadoPedido,
    Producto,
    Usuario,
    DireccionEntrega,
)
from app.modules.pedidos.pedido_repository import PedidoRepository
from app.modules.pedidos.detalle_pedido_repository import DetallePedidoRepository
from app.modules.pedidos.estado_pedido_repository import EstadoPedidoRepository
from app.modules.pedidos.historial_estado_pedido_repository import HistorialEstadoPedidoRepository
from app.modules.pedidos.schemas import (
    PedidoCreate,
    PedidoPublic,
    PedidoDetail,
    PedidoList,
    DetallePedidoPublic,
    EstadoPedidoPublic,
    HistorialEstadoPedidoPublic,
    HistorialEstadoPedidoList,
    ConfirmarPedidoResponse,
    CambiarEstadoPedidoRequest,
)


class PedidoService:
    """
    Servicio de negocio para Pedido.
    Implementa reglas de negocio, transiciones de estado, y validaciones.
    """

    # Transiciones de estado válidas
    TRANSICIONES_VALIDAS = {
        "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
        "CONFIRMADO": ["PREPARANDO", "CANCELADO"],
        "PREPARANDO": ["EN_CAMINO"],
        "EN_CAMINO": ["ENTREGADO"],
        "ENTREGADO": [],
        "CANCELADO": [],
    }

    def __init__(self, session: Session):
        self._session = session
        self._pedido_repo = PedidoRepository(session)
        self._detalle_repo = DetallePedidoRepository(session)
        self._estado_repo = EstadoPedidoRepository(session)
        self._historial_repo = HistorialEstadoPedidoRepository(session)

    # ========================================================================
    # CREAR PEDIDO
    # ========================================================================

    def crear_pedido(self, usuario_id: int, data: PedidoCreate) -> ConfirmarPedidoResponse:
        """
        Crear nuevo pedido.
        Validar stock, generar snapshots, calcular totales.
        
        Args:
            usuario_id: ID del usuario
            data: Datos del pedido (dirección, detalles, descuento, notas)
            
        Returns:
            Pedido creado con detalles y cálculos
            
        Raises:
            HTTPException: Si hay errores de validación o stock
        """
        # Verificar usuario
        usuario = self._session.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario or not usuario.activo or usuario.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        
        # Verificar dirección
        direccion = self._session.query(DireccionEntrega).filter(
            DireccionEntrega.id == data.direccion_entrega_id,
            DireccionEntrega.usuario_id == usuario_id,
            DireccionEntrega.activo.is_(True),
        ).first()
        if not direccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dirección de entrega no encontrada",
            )
        
        # Validar detalles y calcular totales
        detalles_list = []
        subtotal = Decimal("0")
        
        for detalle_data in data.detalles:
            producto = self._session.query(Producto).filter(
                Producto.id == detalle_data.producto_id,
                Producto.activo.is_(True),
                Producto.deleted_at.is_(None),
            ).first()
            
            if not producto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto {detalle_data.producto_id} no encontrado",
                )
            
            # Validar disponibilidad
            if not producto.disponible:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Producto {producto.nombre} no disponible",
                )
            
            # Validar stock si usa stock manual
            if producto.usa_stock_manual:
                if producto.stock_manual is None or producto.stock_manual < detalle_data.cantidad:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Stock insuficiente para {producto.nombre}",
                    )
            
            # Crear snapshot
            subtotal_detalle = producto.precio_base * Decimal(detalle_data.cantidad)
            detalles_list.append({
                "producto_id": producto.id,
                "cantidad": detalle_data.cantidad,
                "nombre_snapshot": producto.nombre,
                "precio_snapshot": producto.precio_base,
                "subtotal_snapshot": subtotal_detalle,
            })
            
            subtotal += subtotal_detalle
        
        # Calcular totales
        # NOTA: costo_envio es 0 por ahora (puede implementarse después)
        costo_envio = Decimal("0")
        total = subtotal - data.descuento + costo_envio
        
        # Obtener estado PENDIENTE
        estado_pendiente = self._session.query(EstadoPedido).filter(
            EstadoPedido.codigo == "PENDIENTE"
        ).first()
        
        if not estado_pendiente:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Estado PENDIENTE no configurado",
            )
        
        # Crear pedido
        pedido = Pedido(
            usuario_id=usuario_id,
            direccion_entrega_id=data.direccion_entrega_id,
            estado_codigo="PENDIENTE",
            subtotal=subtotal,
            descuento=data.descuento,
            costo_envio=costo_envio,
            total=total,
            notas=data.notas,
        )
        
        pedido = self._pedido_repo.add(pedido)
        self._session.flush()  # Obtener ID del pedido
        
        # Crear detalles
        for detalle_data in detalles_list:
            detalle = DetallePedido(
                pedido_id=pedido.id,
                producto_id=detalle_data["producto_id"],
                cantidad=detalle_data["cantidad"],
                nombre_snapshot=detalle_data["nombre_snapshot"],
                precio_snapshot=detalle_data["precio_snapshot"],
                subtotal_snapshot=detalle_data["subtotal_snapshot"],
            )
            self._detalle_repo.add(detalle)
        
        self._session.commit()
        self._session.refresh(pedido)
        
        # Retornar respuesta
        detalles = self._detalle_repo.get_by_pedido_id(pedido.id)
        return ConfirmarPedidoResponse(
            id=pedido.id,
            estado_codigo=pedido.estado_codigo,
            total=pedido.total,
            detalles=[self._detalle_to_public(d) for d in detalles],
            mensaje="Pedido creado exitosamente en estado PENDIENTE",
        )

    # ========================================================================
    # CONFIRMAR PEDIDO
    # ========================================================================

    def confirmar_pedido(self, usuario_id: int, pedido_id: int) -> ConfirmarPedidoResponse:
        """
        Confirmar pedido (PENDIENTE → CONFIRMADO).
        - Descontar stock
        - Cambiar estado a CONFIRMADO
        - Registrar historial
        
        Args:
            usuario_id: ID del usuario
            pedido_id: ID del pedido
            
        Returns:
            Pedido confirmado
            
        Raises:
            HTTPException: Si pedido no existe o no puede confirmarse
        """
        pedido = self._get_pedido_seguro(usuario_id, pedido_id)
        
        # Validar estado actual
        if pedido.estado_codigo != "PENDIENTE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pedido en estado {pedido.estado_codigo}, no puede confirmarse",
            )
        
        # Validar transición
        if "CONFIRMADO" not in self.TRANSICIONES_VALIDAS.get(pedido.estado_codigo, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transición de estado no permitida",
            )
        
        # Descontar stock
        detalles = self._detalle_repo.get_by_pedido_id(pedido_id)
        for detalle in detalles:
            producto = self._session.query(Producto).filter(
                Producto.id == detalle.producto_id
            ).first()
            
            if producto and producto.usa_stock_manual and producto.stock_manual is not None:
                producto.stock_manual -= detalle.cantidad
                self._session.add(producto)
        
        # Cambiar estado
        pedido_anterior_codigo = pedido.estado_codigo
        pedido.estado_codigo = "CONFIRMADO"
        pedido = self._pedido_repo.add(pedido)
        
        # Registrar historial
        historial = HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_desde_codigo=pedido_anterior_codigo,
            estado_hacia_codigo="CONFIRMADO",
            usuario_id=usuario_id,
            motivo="Pedido confirmado por usuario",
            fecha=datetime.now(timezone.utc),
        )
        self._historial_repo.add(historial)
        
        self._session.commit()
        self._session.refresh(pedido)
        
        return ConfirmarPedidoResponse(
            id=pedido.id,
            estado_codigo=pedido.estado_codigo,
            total=pedido.total,
            detalles=[self._detalle_to_public(d) for d in detalles],
            mensaje="Pedido confirmado exitosamente. Stock descontado.",
        )

    # ========================================================================
    # CANCELAR PEDIDO
    # ========================================================================

    def cancelar_pedido(self, usuario_id: int, pedido_id: int, motivo: Optional[str] = None) -> PedidoDetail:
        """
        Cancelar pedido.
        Validar que puede cancelarse, cambiar estado a CANCELADO.
        
        Args:
            usuario_id: ID del usuario
            pedido_id: ID del pedido
            motivo: Razón de cancelación (opcional)
            
        Returns:
            Pedido cancelado
            
        Raises:
            HTTPException: Si pedido no puede cancelarse
        """
        pedido = self._get_pedido_seguro(usuario_id, pedido_id)
        
        # Estados que pueden cancelarse: PENDIENTE, CONFIRMADO
        if pedido.estado_codigo not in ["PENDIENTE", "CONFIRMADO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cancelar pedido en estado {pedido.estado_codigo}",
            )
        
        # Si estaba confirmado, restaurar stock
        if pedido.estado_codigo == "CONFIRMADO":
            detalles = self._detalle_repo.get_by_pedido_id(pedido_id)
            for detalle in detalles:
                producto = self._session.query(Producto).filter(
                    Producto.id == detalle.producto_id
                ).first()
                
                if producto and producto.usa_stock_manual and producto.stock_manual is not None:
                    producto.stock_manual += detalle.cantidad
                    self._session.add(producto)
        
        # Cambiar estado
        pedido_anterior_codigo = pedido.estado_codigo
        pedido.estado_codigo = "CANCELADO"
        pedido = self._pedido_repo.add(pedido)
        
        # Registrar historial
        historial = HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_desde_codigo=pedido_anterior_codigo,
            estado_hacia_codigo="CANCELADO",
            usuario_id=usuario_id,
            motivo=motivo or "Pedido cancelado",
            fecha=datetime.now(timezone.utc),
        )
        self._historial_repo.add(historial)
        
        self._session.commit()
        self._session.refresh(pedido)
        
        return self._to_detail(pedido)

    # ========================================================================
    # CAMBIAR ESTADO
    # ========================================================================

    def cambiar_estado(
        self,
        usuario_id: int,
        pedido_id: int,
        data: CambiarEstadoPedidoRequest,
    ) -> PedidoDetail:
        """
        Cambiar estado del pedido.
        Validar transición permitida.
        
        Args:
            usuario_id: ID del usuario (admin)
            pedido_id: ID del pedido
            data: Nuevo estado y motivo
            
        Returns:
            Pedido con nuevo estado
            
        Raises:
            HTTPException: Si transición no es válida
        """
        pedido = self._session.query(Pedido).filter(Pedido.id == pedido_id).first()
        if not pedido or pedido.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )
        
        # Verificar estado destino existe
        estado_destino = self._session.query(EstadoPedido).filter(
            EstadoPedido.codigo == data.estado_codigo
        ).first()
        if not estado_destino:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Estado {data.estado_codigo} no existe",
            )
        
        # Validar transición
        transiciones_validas = self.TRANSICIONES_VALIDAS.get(pedido.estado_codigo, [])
        if data.estado_codigo not in transiciones_validas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transición de {pedido.estado_codigo} a {data.estado_codigo} no permitida",
            )
        
        # Cambiar estado
        pedido_anterior_codigo = pedido.estado_codigo
        pedido.estado_codigo = data.estado_codigo
        pedido = self._pedido_repo.add(pedido)
        
        # Registrar historial
        historial = HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_desde_codigo=pedido_anterior_codigo,
            estado_hacia_codigo=data.estado_codigo,
            usuario_id=usuario_id,
            motivo=data.motivo or f"Cambio de estado a {data.estado_codigo}",
            fecha=datetime.now(timezone.utc),
        )
        self._historial_repo.add(historial)
        
        self._session.commit()
        self._session.refresh(pedido)
        
        return self._to_detail(pedido)

    # ========================================================================
    # OBTENER PEDIDOS
    # ========================================================================

    def get_pedido(self, usuario_id: int, pedido_id: int) -> PedidoDetail:
        """
        Obtener detalle de pedido.
        
        Args:
            usuario_id: ID del usuario
            pedido_id: ID del pedido
            
        Returns:
            Pedido con detalles
            
        Raises:
            HTTPException: Si pedido no existe o no pertenece al usuario
        """
        pedido = self._get_pedido_seguro(usuario_id, pedido_id)
        return self._to_detail(pedido)

    def list_pedidos(
        self,
        usuario_id: int,
        offset: int = 0,
        limit: int = 20,
        is_admin: bool = False,
    ) -> PedidoList:
        """
        Listar pedidos del usuario.
        
        Args:
            usuario_id: ID del usuario
            offset: Offset de paginación
            limit: Límite de resultados
            
        Returns:
            Lista paginada de pedidos
        """
        if is_admin:
            pedidos = self._pedido_repo.get_all(offset=offset, limit=limit)
            total = self._pedido_repo.count_all()
        else:
            pedidos = self._pedido_repo.get_by_usuario_id(usuario_id, offset=offset, limit=limit)
            total = self._pedido_repo.count_by_usuario(usuario_id)
        
        return PedidoList(
            data=[self._to_public(p) for p in pedidos],
            total=total,
        )

    # ========================================================================
    # HISTORIAL
    # ========================================================================

    def get_historial(self, usuario_id: int, pedido_id: int) -> HistorialEstadoPedidoList:
        """
        Obtener historial de cambios de estado.
        
        Args:
            usuario_id: ID del usuario
            pedido_id: ID del pedido
            
        Returns:
            Lista de cambios de estado
            
        Raises:
            HTTPException: Si pedido no existe o no pertenece al usuario
        """
        # Verificar que el pedido pertenece al usuario
        self._get_pedido_seguro(usuario_id, pedido_id)
        
        historiales = self._historial_repo.get_by_pedido_id(pedido_id)
        
        return HistorialEstadoPedidoList(
            data=[self._historial_to_public(h) for h in historiales],
        )

    # ========================================================================
    # HELPERS
    # ========================================================================

    def _get_pedido_seguro(self, usuario_id: int, pedido_id: int) -> Pedido:
        """
        Obtener pedido verificando que pertenece al usuario y no está eliminado.
        
        Raises:
            HTTPException: Si pedido no existe o no pertenece al usuario
        """
        pedido = self._session.query(Pedido).filter(
            Pedido.id == pedido_id,
            Pedido.usuario_id == usuario_id,
            Pedido.deleted_at.is_(None),
        ).first()
        
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )
        
        return pedido

    def _to_public(self, pedido: Pedido) -> PedidoPublic:
        """Convertir Pedido a PedidoPublic."""
        return PedidoPublic(
            id=pedido.id,
            usuario_id=pedido.usuario_id,
            direccion_entrega_id=pedido.direccion_entrega_id,
            estado_codigo=pedido.estado_codigo,
            subtotal=pedido.subtotal,
            descuento=pedido.descuento,
            costo_envio=pedido.costo_envio,
            total=pedido.total,
            notas=pedido.notas,
            created_at=pedido.created_at,
        )

    def _to_detail(self, pedido: Pedido) -> PedidoDetail:
        """Convertir Pedido a PedidoDetail."""
        estado = self._session.query(EstadoPedido).filter(
            EstadoPedido.codigo == pedido.estado_codigo
        ).first()
        
        detalles = self._detalle_repo.get_by_pedido_id(pedido.id)
        
        return PedidoDetail(
            id=pedido.id,
            usuario_id=pedido.usuario_id,
            direccion_entrega_id=pedido.direccion_entrega_id,
            estado_codigo=pedido.estado_codigo,
            subtotal=pedido.subtotal,
            descuento=pedido.descuento,
            costo_envio=pedido.costo_envio,
            total=pedido.total,
            notas=pedido.notas,
            created_at=pedido.created_at,
            updated_at=pedido.updated_at,
            estado=self._estado_to_public(estado) if estado else EstadoPedidoPublic(
                codigo="UNKNOWN",
                nombre="Desconocido",
            ),
            detalles=[self._detalle_to_public(d) for d in detalles],
        )

    def _detalle_to_public(self, detalle: DetallePedido) -> DetallePedidoPublic:
        """Convertir DetallePedido a DetallePedidoPublic."""
        return DetallePedidoPublic(
            id=detalle.id,
            producto_id=detalle.producto_id,
            cantidad=detalle.cantidad,
            nombre_snapshot=detalle.nombre_snapshot,
            precio_snapshot=detalle.precio_snapshot,
            subtotal_snapshot=detalle.subtotal_snapshot,
        )

    def _estado_to_public(self, estado: EstadoPedido) -> EstadoPedidoPublic:
        """Convertir EstadoPedido a EstadoPedidoPublic."""
        return EstadoPedidoPublic(
            codigo=estado.codigo,
            nombre=estado.nombre,
            descripcion=estado.descripcion,
        )

    def _historial_to_public(self, historial: HistorialEstadoPedido) -> HistorialEstadoPedidoPublic:
        """Convertir HistorialEstadoPedido a HistorialEstadoPedidoPublic."""
        return HistorialEstadoPedidoPublic(
            id=historial.id,
            pedido_id=historial.pedido_id,
            estado_desde_codigo=historial.estado_desde_codigo,
            estado_hacia_codigo=historial.estado_hacia_codigo,
            usuario_id=historial.usuario_id,
            motivo=historial.motivo,
            fecha=historial.fecha,
        )
