import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.config import settings
from app.core.rbac import STATE_CONFIRMADO
from app.models.pago import Pago
from app.models.pedido import Pedido
from app.modules.payments.schemas import (
    PagoCrearResponse,
    PagoEstadoResponse,
    PagoPublic,
    ManualAprobarRequest,
)
from app.modules.payments.unit_of_work import PagoUnitOfWork
from app.modules.pedidos.detalle_pedido_repository import DetallePedidoRepository
from app.modules.productos.repository import ProductoRepository

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_mp_access_token(self) -> Optional[str]:
        return settings.MP_ACCESS_TOKEN or settings.MERCADOPAGO_ACCESS_TOKEN or None

    def _get_mp_public_key(self) -> Optional[str]:
        return settings.MP_PUBLIC_KEY or settings.MERCADOPAGO_PUBLIC_KEY or None

    def _crear_preferencia_mp(self, monto: Decimal, titulo: str,
                               pedido_id: int, back_urls: dict) -> dict:
        access_token = self._get_mp_access_token()
        if not access_token:
            raise RuntimeError("MercadoPago no está configurado. Configure MP_ACCESS_TOKEN")

        try:
            import mercadopago
            sdk = mercadopago.SDK(access_token)

            notification_url = (
                settings.MP_WEBHOOK_URL
                or f"{settings.VITE_API_URL}/api/v1/pagos/webhook"
            )

            preference_data = {
                "items": [{
                    "title": titulo,
                    "quantity": 1,
                    "unit_price": float(monto),
                    "currency_id": "ARS",
                }],
                "external_reference": str(pedido_id),
                "back_urls": back_urls,
                "notification_url": notification_url,
            }

            result = sdk.preference().create(preference_data)

            if result.get("status") not in (200, 201):
                logger.error("Error creando preferencia MP: %s", result)
                raise RuntimeError(
                    "Error al crear preferencia: "
                    f"{result.get('response', {}).get('message', 'desconocido')}"
                )

            response = result.get("response", {})
            return {
                "preference_id": response.get("id"),
                "init_point": response.get("sandbox_init_point") or response.get("init_point"),
            }

        except ImportError:
            raise RuntimeError("pip install mercadopago")
        except Exception as e:
            logger.exception("Error inesperado al crear preferencia MP")
            raise RuntimeError(f"Error de conexión con MP: {str(e)}")

    def _consultar_pago_mp(self, payment_id: int) -> dict:
        access_token = self._get_mp_access_token()
        if not access_token:
            raise RuntimeError("MP no configurado")

        try:
            import mercadopago
            sdk = mercadopago.SDK(access_token)
            result = sdk.payment().get(payment_id)

            if result.get("status") != 200:
                logger.error("Error consultando pago MP %s: %s", payment_id, result)
                raise RuntimeError(f"Error al consultar pago {payment_id}")

            response = result.get("response", {})
            return {
                "mp_payment_id": response.get("id"),
                "mp_status": response.get("status"),
                "mp_status_detail": response.get("status_detail"),
                "mp_merchant_order_id": response.get("merchant_order_id"),
            }

        except ImportError:
            raise RuntimeError("pip install mercadopago")
        except Exception as e:
            logger.exception("Error consultando pago MP %s", payment_id)
            raise RuntimeError(f"Error de conexión con MP: {str(e)}")

    def crear_pago(self, pedido_id: int) -> PagoCrearResponse:
        pedido = self._session.get(Pedido, pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )

        if not self._get_mp_access_token():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MercadoPago no configurado. Configure MP_ACCESS_TOKEN",
            )

        ngrok_url = settings.NGROK_URL or "http://localhost:8000"
        back_urls = {
            "success": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/success",
            "failure": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/failure",
            "pending": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/pending",
        }

        try:
            mp_data = self._crear_preferencia_mp(
                monto=pedido.total,
                titulo=f"Pedido #{pedido_id} - FoodStore",
                pedido_id=pedido_id,
                back_urls=back_urls,
            )
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        with PagoUnitOfWork(self._session) as uow:
            pago = Pago(
                pedido_id=pedido_id,
                monto=pedido.total,
                estado="pendiente",
                mp_preference_id=mp_data["preference_id"],
                mp_init_point=mp_data.get("init_point"),
                idempotency_key=str(uuid.uuid4()),
            )
            uow.pagos.add(pago)

            pedido.forma_pago_codigo = "MERCADOPAGO"
            self._session.add(pedido)

            return PagoCrearResponse(
                pago_id=pago.id,
                preference_id=mp_data["preference_id"],
                init_point=mp_data.get("init_point"),
                public_key=self._get_mp_public_key(),
            )

    def obtener_pago_por_pedido(self, pedido_id: int) -> PagoPublic:
        with PagoUnitOfWork(self._session) as uow:
            pago = uow.pagos.get_ultimo_by_pedido(pedido_id)
            if not pago:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pago no encontrado para este pedido",
                )
            return PagoPublic(
                id=pago.id,
                pedido_id=pago.pedido_id,
                monto=pago.monto,
                estado=pago.estado,
                mp_preference_id=pago.mp_preference_id,
                mp_init_point=pago.mp_init_point,
                mp_payment_id=pago.mp_payment_id,
                mp_merchant_order_id=pago.mp_merchant_order_id,
                mp_status=pago.mp_status,
                mp_status_detail=pago.mp_status_detail,
                created_at=pago.created_at.isoformat() if pago.created_at else None,
            )

    def procesar_webhook(self, data: dict,
                         query_params: Optional[dict] = None) -> dict:
        logger.info("Webhook recibido: data=%s qs=%s", data, query_params or {})

        if not data and query_params:
            data = query_params

        topic = data.get("type") or data.get("topic")
        data_id = data.get("data_id") or (data.get("data") or {}).get("id")
        payment_id = data.get("id")

        if not data_id and query_params:
            data_id = query_params.get("data.id") or query_params.get("id")
        if not topic and query_params:
            topic = query_params.get("topic") or query_params.get("type")

        pago_mp_id = payment_id or data_id

        if not pago_mp_id:
            return {"status": "ignored", "reason": "No payment ID"}

        if topic not in (None, "payment", "merchant_order"):
            return {"status": "ignored", "reason": f"Topic: {topic}"}

        try:
            mp_info = self._consultar_pago_mp(int(pago_mp_id))
            estado_mp = mp_info.get("mp_status")

            if estado_mp == "approved":
                nuevo_estado = "aprobado"
            elif estado_mp in ("rejected", "cancelled",
                               "refunded", "charged_back"):
                nuevo_estado = "rechazado"
            elif estado_mp in ("pending", "in_process", "authorized"):
                nuevo_estado = "pendiente"
            else:
                return {"status": "ignored",
                        "reason": f"Unknown status: {estado_mp}"}

            with PagoUnitOfWork(self._session) as uow:
                pago = uow.pagos.get_by_mp_payment_id(int(pago_mp_id))

                if not pago and mp_info.get("mp_merchant_order_id"):
                    pago = uow.pagos.get_by_mp_merchant_order_id(
                        mp_info["mp_merchant_order_id"]
                    )

                if not pago:
                    return {"status": "ignored",
                            "reason": "Pago not found in local DB"}

                if pago.estado != "pendiente":
                    return {"status": "already_processed",
                            "estado": pago.estado}

                pago.mp_payment_id = int(pago_mp_id)
                pago.mp_status = estado_mp
                pago.mp_status_detail = mp_info.get("mp_status_detail")
                pago.mp_merchant_order_id = mp_info.get("mp_merchant_order_id")
                pago.estado = nuevo_estado
                pago.updated_at = datetime.now(timezone.utc)
                uow.pagos.add(pago)

                if nuevo_estado == "aprobado":
                    pedido = self._session.get(Pedido, pago.pedido_id)
                    if pedido:
                        pedido.estado_codigo = STATE_CONFIRMADO
                        pedido.forma_pago_codigo = "MERCADOPAGO"
                        pedido.updated_at = datetime.now(timezone.utc)
                        self._session.add(pedido)

                        self._descontar_stock(pedido.id)

            return {
                "status": "processed",
                "pago_id": pago.id,
                "estado": nuevo_estado,
                "pedido_id": pago.pedido_id,
            }

        except Exception as e:
            logger.exception("Error procesando webhook MP")
            return {"status": "error", "reason": str(e)}

    def _descontar_stock(self, pedido_id: int) -> None:
        detalle_repo = DetallePedidoRepository(self._session)
        producto_repo = ProductoRepository(self._session)

        detalles = detalle_repo.get_by_pedido_id(pedido_id)
        for detalle in detalles:
            producto = producto_repo.get_by_id(detalle.producto_id)
            if not producto:
                continue

            if producto.stock_manual is not None:
                producto.stock_manual -= detalle.cantidad
                producto_repo.add(producto)
            else:
                ingredientes = list(producto.productos_ingredientes)
                if ingredientes:
                    for pi in ingredientes:
                        ing = pi.ingrediente
                        if ing and ing.stock_actual > 0:
                            delta = float(pi.cantidad) * detalle.cantidad
                            ing.stock_actual = max(0, ing.stock_actual - delta)
                            self._session.add(ing)

    def confirmar_pago(self, pedido_id: int,
                       payment_id: Optional[int] = None) -> PagoEstadoResponse:
        pedido = self._session.get(Pedido, pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )

        resolved_payment_id = payment_id
        if not resolved_payment_id:
            with PagoUnitOfWork(self._session) as uow:
                pago_local = uow.pagos.get_ultimo_by_pedido(pedido_id)
                if pago_local and pago_local.mp_payment_id:
                    resolved_payment_id = pago_local.mp_payment_id

        if not resolved_payment_id:
            try:
                import mercadopago
                access_token = self._get_mp_access_token()
                if access_token:
                    sdk = mercadopago.SDK(access_token)
                    search_result = sdk.payment().search({
                        "external_reference": str(pedido_id),
                        "sort": "date_created",
                        "criteria": "desc",
                        "limit": 1,
                    })
                    if search_result.get("status") == 200:
                        results = search_result.get("response", {}).get("results", [])
                        if results:
                            resolved_payment_id = results[0].get("id")
            except Exception as e:
                logger.warning("Error buscando pago MP por external_reference: %s", e)

        if resolved_payment_id:
            try:
                mp_info = self._consultar_pago_mp(resolved_payment_id)
            except RuntimeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                )

            estado_mp = mp_info.get("mp_status")
            if estado_mp == "approved":
                nuevo_estado = "aprobado"
            elif estado_mp in ("rejected", "cancelled",
                               "refunded", "charged_back"):
                nuevo_estado = "rechazado"
            else:
                nuevo_estado = "pendiente"

            with PagoUnitOfWork(self._session) as uow:
                pago = uow.pagos.get_by_mp_payment_id(resolved_payment_id)
                if not pago:
                    pago = uow.pagos.get_ultimo_by_pedido(pedido_id)

                if pago:
                    pago.mp_payment_id = resolved_payment_id
                    pago.mp_status = estado_mp
                    pago.mp_status_detail = mp_info.get("mp_status_detail")
                    pago.mp_merchant_order_id = mp_info.get(
                        "mp_merchant_order_id"
                    )
                    pago.estado = nuevo_estado
                    pago.updated_at = datetime.now(timezone.utc)
                    uow.pagos.add(pago)

                    if nuevo_estado == "aprobado":
                        pedido.estado_codigo = STATE_CONFIRMADO
                        pedido.forma_pago_codigo = "MERCADOPAGO"
                        pedido.updated_at = datetime.now(timezone.utc)
                        self._session.add(pedido)

                        self._descontar_stock(pedido.id)

            return PagoEstadoResponse(estado=nuevo_estado, pedido_id=pedido_id)

        with PagoUnitOfWork(self._session) as uow:
            pago_local = uow.pagos.get_ultimo_by_pedido(pedido_id)
            return PagoEstadoResponse(
                estado=pago_local.estado if pago_local else None,
                pedido_id=pedido_id,
            )

    def aprobar_manual(self, data: ManualAprobarRequest) -> PagoEstadoResponse:
        pedido = self._session.get(Pedido, data.pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )

        with PagoUnitOfWork(self._session) as uow:
            pago = uow.pagos.get_ultimo_by_pedido(data.pedido_id)

            if data.mp_payment_id:
                try:
                    mp_info = self._consultar_pago_mp(data.mp_payment_id)
                    estado_mp = mp_info.get("mp_status")
                    if estado_mp == "approved":
                        nuevo_estado = "aprobado"
                    elif estado_mp in ("rejected", "cancelled", "refunded", "charged_back"):
                        nuevo_estado = "rechazado"
                    else:
                        nuevo_estado = "pendiente"
                except RuntimeError:
                    nuevo_estado = "aprobado"
            else:
                nuevo_estado = "aprobado"
                mp_info = {}

            if pago:
                pago.estado = nuevo_estado
                pago.mp_status = mp_info.get("mp_status") if data.mp_payment_id else "manual"
                pago.mp_status_detail = mp_info.get("mp_status_detail") if data.mp_payment_id else "Aprobado manualmente"
                if data.mp_payment_id:
                    pago.mp_payment_id = data.mp_payment_id
                pago.updated_at = datetime.now(timezone.utc)
                uow.pagos.add(pago)
            else:
                pago = Pago(
                    pedido_id=data.pedido_id,
                    monto=pedido.total,
                    estado=nuevo_estado,
                    mp_payment_id=data.mp_payment_id,
                    mp_status=mp_info.get("mp_status") if data.mp_payment_id else "manual",
                    mp_status_detail=mp_info.get("mp_status_detail") if data.mp_payment_id else "Aprobado manualmente",
                    idempotency_key=str(uuid.uuid4()),
                )
                uow.pagos.add(pago)

            if nuevo_estado == "aprobado":
                pedido.estado_codigo = STATE_CONFIRMADO
                pedido.updated_at = datetime.now(timezone.utc)
                self._session.add(pedido)
                self._descontar_stock(pedido.id)

        return PagoEstadoResponse(estado=nuevo_estado, pedido_id=data.pedido_id)
