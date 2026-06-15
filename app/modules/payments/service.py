import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.config import settings
from app.core.rbac import STATE_CONFIRMADO
from app.core.stock_utils import descontar_stock_pedido
from app.models.pago import Pago
from app.models.pedido import Pedido
from app.modules.payments.schemas import (
    PagoCrearResponse,
    PagoEstadoResponse,
    PagoPublic,
    ManualAprobarRequest,
)
from app.modules.payments.unit_of_work import PagoUnitOfWork

MP_API_BASE = "https://api.mercadopago.com"
logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_mp_access_token(self) -> Optional[str]:
        return settings.MP_ACCESS_TOKEN or settings.MERCADOPAGO_ACCESS_TOKEN or None

    def _get_mp_public_key(self) -> Optional[str]:
        return settings.MP_PUBLIC_KEY or settings.MERCADOPAGO_PUBLIC_KEY or None

    async def _crear_preferencia_mp(
        self, monto: Decimal, titulo: str, pedido_id: int, back_urls: dict
    ) -> dict:
        access_token = self._get_mp_access_token()
        if not access_token:
            raise RuntimeError("MercadoPago no está configurado. Configure MP_ACCESS_TOKEN")

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

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": str(uuid.uuid4()),
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{MP_API_BASE}/checkout/preferences",
                    headers=headers,
                    json=preference_data,
                )
        except httpx.RequestError as e:
            logger.exception("Error de conexión con MP al crear preferencia")
            raise RuntimeError(f"Error de conexión con MercadoPago: {e}")

        if response.status_code not in (200, 201):
            logger.error("Error creando preferencia MP: status=%s body=%s", response.status_code, response.text)
            raise RuntimeError(
                f"Error al crear preferencia: {response.json().get('message', 'desconocido')}"
            )

        result = response.json()
        return {
            "preference_id": result.get("id"),
            "init_point": result.get("init_point") or result.get("sandbox_init_point"),
        }

    async def _consultar_pago_mp(self, payment_id: int) -> dict:
        access_token = self._get_mp_access_token()
        if not access_token:
            raise RuntimeError("MP no configurado")

        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{MP_API_BASE}/v1/payments/{payment_id}",
                    headers=headers,
                )
        except httpx.RequestError as e:
            logger.exception("Error consultando pago MP %s", payment_id)
            raise RuntimeError(f"Error de conexión con MP: {e}")

        if response.status_code != 200:
            logger.error("Error consultando pago MP %s: status=%s body=%s", payment_id, response.status_code, response.text)
            raise RuntimeError(f"Error al consultar pago {payment_id}")

        data = response.json()
        return {
            "mp_payment_id": data.get("id"),
            "mp_status": data.get("status"),
            "mp_status_detail": data.get("status_detail"),
            "mp_merchant_order_id": data.get("merchant_order_id"),
        }

    async def _buscar_pago_mp_por_referencia(self, pedido_id: int) -> Optional[int]:
        access_token = self._get_mp_access_token()
        if not access_token:
            return None

        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{MP_API_BASE}/v1/payments/search",
                    headers=headers,
                    params={
                        "external_reference": str(pedido_id),
                        "sort": "date_created",
                        "criteria": "desc",
                        "limit": 1,
                    },
                )
        except httpx.RequestError:
            return None

        if response.status_code != 200:
            return None

        results = response.json().get("results", [])
        if results:
            return results[0].get("id")
        return None

    async def crear_pago(self, pedido_id: int, current_user_id: int) -> PagoCrearResponse:
        pedido = self._session.get(Pedido, pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pedido no encontrado",
            )

        if pedido.usuario_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes pagar un pedido que no te pertenece",
            )

        if not self._get_mp_access_token():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MercadoPago no configurado. Configure MP_ACCESS_TOKEN",
            )

        ngrok_url = settings.NGROK_URL or settings.VITE_FRONTEND_URL or "http://localhost:8000"
        back_urls = {
            "success": f"{ngrok_url}/orders/{pedido_id}/success",
            "failure": f"{ngrok_url}/orders/{pedido_id}/failure",
            "pending": f"{ngrok_url}/orders/{pedido_id}/pending",
        }

        try:
            mp_data = await self._crear_preferencia_mp(
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

    async def procesar_webhook(
        self, data: dict, query_params: Optional[dict] = None
    ) -> dict:
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
            mp_info = await self._consultar_pago_mp(int(pago_mp_id))
            estado_mp = mp_info.get("mp_status")

            if estado_mp == "approved":
                nuevo_estado = "aprobado"
            elif estado_mp in ("rejected", "cancelled", "refunded", "charged_back"):
                nuevo_estado = "rechazado"
            elif estado_mp in ("pending", "in_process", "authorized"):
                nuevo_estado = "pendiente"
            else:
                return {"status": "ignored", "reason": f"Unknown status: {estado_mp}"}

            with PagoUnitOfWork(self._session) as uow:
                pago = uow.pagos.get_by_mp_payment_id(int(pago_mp_id))

                if not pago and mp_info.get("mp_merchant_order_id"):
                    pago = uow.pagos.get_by_mp_merchant_order_id(
                        mp_info["mp_merchant_order_id"]
                    )

                if not pago:
                    return {"status": "ignored", "reason": "Pago not found in local DB"}

                if pago.estado != "pendiente":
                    return {"status": "already_processed", "estado": pago.estado}

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
                        descontar_stock_pedido(self._session, pedido.id)

            return {
                "status": "processed",
                "pago_id": pago.id,
                "estado": nuevo_estado,
                "pedido_id": pago.pedido_id,
            }

        except Exception as e:
            logger.exception("Error procesando webhook MP")
            return {"status": "error", "reason": str(e)}

    async def confirmar_pago(
        self, pedido_id: int, payment_id: Optional[int] = None
    ) -> PagoEstadoResponse:
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
            resolved_payment_id = await self._buscar_pago_mp_por_referencia(pedido_id)

        if resolved_payment_id:
            try:
                mp_info = await self._consultar_pago_mp(resolved_payment_id)
            except RuntimeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                )

            estado_mp = mp_info.get("mp_status")
            if estado_mp == "approved":
                nuevo_estado = "aprobado"
            elif estado_mp in ("rejected", "cancelled", "refunded", "charged_back"):
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
                    pago.mp_merchant_order_id = mp_info.get("mp_merchant_order_id")
                    pago.estado = nuevo_estado
                    pago.updated_at = datetime.now(timezone.utc)
                    uow.pagos.add(pago)

                    if nuevo_estado == "aprobado":
                        pedido.estado_codigo = STATE_CONFIRMADO
                        pedido.forma_pago_codigo = "MERCADOPAGO"
                        pedido.updated_at = datetime.now(timezone.utc)
                        self._session.add(pedido)
                        descontar_stock_pedido(self._session, pedido.id)

            return PagoEstadoResponse(estado=nuevo_estado, pedido_id=pedido_id)

        with PagoUnitOfWork(self._session) as uow:
            pago_local = uow.pagos.get_ultimo_by_pedido(pedido_id)
            return PagoEstadoResponse(
                estado=pago_local.estado if pago_local else None,
                pedido_id=pedido_id,
            )

    async def aprobar_manual(self, data: ManualAprobarRequest) -> PagoEstadoResponse:
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
                    mp_info = await self._consultar_pago_mp(data.mp_payment_id)
                    estado_mp = mp_info.get("mp_status")
                    if estado_mp == "approved":
                        nuevo_estado = "aprobado"
                    elif estado_mp in ("rejected", "cancelled", "refunded", "charged_back"):
                        nuevo_estado = "rechazado"
                    else:
                        nuevo_estado = "pendiente"
                except RuntimeError:
                    nuevo_estado = "aprobado"
                    mp_info = {}
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
                descontar_stock_pedido(self._session, pedido.id)

        return PagoEstadoResponse(estado=nuevo_estado, pedido_id=data.pedido_id)
