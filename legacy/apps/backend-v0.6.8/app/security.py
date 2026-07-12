import base64
import hashlib
import hmac
import json
import os
import time
from .env import load_local_env
load_local_env()
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import AdminUser

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
TOKEN_TTL_SECONDS = 60 * 60 * 12
bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """PBKDF2 password hashing using only Python standard library.

    Format: pbkdf2_sha256$iterations$salt_b64$hash_b64
    """
    iterations = 260_000
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${_b64(salt)}${_b64(digest)}"

def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = _unb64(salt_b64)
        expected = _unb64(digest_b64)
        given = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(expected, given)
    except Exception:
        return False

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _unb64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_token(email: str, role: str) -> str:
    payload = {"email": email, "role": role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    payload_b64 = _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64(sig)}"

def read_token(token: str) -> dict:
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
        given = _unb64(sig_b64)
        if not hmac.compare_digest(expected, given):
            raise ValueError("bad signature")
        payload = json.loads(_unb64(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

def current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = read_token(credentials.credentials)
    user = db.query(AdminUser).filter(AdminUser.email == payload["email"], AdminUser.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    return user
