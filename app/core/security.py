"""
Utilidades de seguridad: hashing de contraseñas y JWT.
"""

import json
import hmac
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hashear contraseña usando PBKDF2-SHA256 (simple pero seguro).
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        Hash de la contraseña
    """
    salt = b"secret_salt_food_store"  # En producción, usar salt dinámico
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        100000,  # iteraciones
    )
    return base64.b64encode(key).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verificar contraseña contra su hash.
    
    Args:
        password: Contraseña en texto plano
        password_hash: Hash almacenado
        
    Returns:
        True si la contraseña es correcta, False en caso contrario
    """
    return hash_password(password) == password_hash


class JWTHandler:
    """
    Manejador simple de JWT sin librerías externas.
    NOTA: Para producción, usar PyJWT.
    
    Token structure: header.payload.signature
    """

    SECRET_KEY = "food_store_secret_key_change_in_production"  # CAMBIAR EN PRODUCCIÓN
    ALGORITHM = "HS256"
    TOKEN_EXPIRY_HOURS = 24

    @classmethod
    def create_token(cls, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Crear JWT token.
        
        Args:
            data: Datos a incluir en el token
            expires_delta: Duración del token (default: 24h)
            
        Returns:
            Token JWT como string
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(hours=cls.TOKEN_EXPIRY_HOURS)
        
        to_encode["exp"] = int(expire.timestamp())
        
        # Header
        header = {"alg": cls.ALGORITHM, "typ": "JWT"}
        header_encoded = base64.urlsafe_b64encode(
            json.dumps(header).encode()
        ).decode().rstrip("=")
        
        # Payload
        payload_encoded = base64.urlsafe_b64encode(
            json.dumps(to_encode).encode()
        ).decode().rstrip("=")
        
        # Signature
        message = f"{header_encoded}.{payload_encoded}"
        signature = base64.urlsafe_b64encode(
            hmac.new(
                cls.SECRET_KEY.encode(),
                message.encode(),
                hashlib.sha256,
            ).digest()
        ).decode().rstrip("=")
        
        token = f"{message}.{signature}"
        return token

    @classmethod
    def verify_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """
        Verificar y decodificar JWT token.
        
        Args:
            token: Token JWT
            
        Returns:
            Datos del token si es válido, None si no es válido
        """
        try:
            # Separar partes
            parts = token.split(".")
            if len(parts) != 3:
                return None
            
            header_encoded, payload_encoded, signature = parts
            
            # Verificar firma
            message = f"{header_encoded}.{payload_encoded}"
            expected_signature = base64.urlsafe_b64encode(
                hmac.new(
                    cls.SECRET_KEY.encode(),
                    message.encode(),
                    hashlib.sha256,
                ).digest()
            ).decode().rstrip("=")
            
            if signature != expected_signature:
                return None
            
            # Decodificar payload
            # Agregar padding si es necesario
            padding = 4 - (len(payload_encoded) % 4)
            if padding != 4:
                payload_encoded += "=" * padding
            
            payload_json = base64.urlsafe_b64decode(payload_encoded).decode()
            payload = json.loads(payload_json)
            
            # Verificar expiración
            exp = payload.get("exp")
            if exp is None:
                return None
            
            if datetime.now(timezone.utc).timestamp() > exp:
                return None
            
            return payload
        except Exception:
            return None
