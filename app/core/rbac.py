"""Constantes y helpers de RBAC."""

ROLE_ADMIN = "ADMIN"
ROLE_STOCK = "STOCK"
ROLE_PEDIDOS = "PEDIDOS"
ROLE_CLIENT = "CLIENT"

ALL_ROLES = [ROLE_ADMIN, ROLE_STOCK, ROLE_PEDIDOS, ROLE_CLIENT]


STATE_PENDIENTE = "PENDIENTE"
STATE_CONFIRMADO = "CONFIRMADO"
STATE_EN_PREP = "EN_PREP"
STATE_EN_CAMINO = "EN_CAMINO"
STATE_ENTREGADO = "ENTREGADO"
STATE_CANCELADO = "CANCELADO"
STATE_PAGADO = "PAGADO"

ALL_STATES = [
    STATE_PENDIENTE,
    STATE_CONFIRMADO,
    STATE_EN_PREP,
    STATE_EN_CAMINO,
    STATE_ENTREGADO,
    STATE_CANCELADO,
    STATE_PAGADO,
]


def normalize_role(role: str) -> str:
    return (role or "").strip().upper()


def normalize_state(state: str) -> str:
    raw = (state or "").strip().upper()
    if raw == "PREPARANDO":
        return STATE_EN_PREP
    return raw
