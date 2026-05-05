import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import APIRouter, HTTPException, status

from app.modules.auth.schemas import LoginRequest, LoginResponse

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "food-store-dev-secret")
JWT_EXPIRES_SECONDS = 60 * 60


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _sign(raw: str) -> str:
    digest = hmac.new(JWT_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).digest()
    return _b64url_encode(digest)


def create_jwt(username: str) -> str:
    now = int(time.time())

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + JWT_EXPIRES_SECONDS,
    }

    header_encoded = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_encoded = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    unsigned_token = f"{header_encoded}.{payload_encoded}"
    signature = _sign(unsigned_token)

    return f"{unsigned_token}.{signature}"


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest) -> LoginResponse:
    if data.username != "admin" or data.password != "contraseña123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )

    token = create_jwt(data.username)
    return LoginResponse(access_token=token, expires_in=JWT_EXPIRES_SECONDS)
