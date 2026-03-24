import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
# Fix for passlib 1.7.4 incompatibility with bcrypt >= 4.0.0
import bcrypt
try:
    bcrypt.__about__
except AttributeError:
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

# Fix for ValueError: password cannot be longer than 72 bytes
# This monkeypatch prevents passlib from crashing when checking for the "wrap bug"
_original_hashpw = bcrypt.hashpw
def _hashpw_patch(password, salt):
    if len(password) > 72:
        password = password[:72]
    return _original_hashpw(password, salt)
bcrypt.hashpw = _hashpw_patch

from passlib.context import CryptContext
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.environ.get("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRATION_DAYS", 30))

def hash_password(password: str) -> str:
    # Bcrypt has a limit of 72 bytes. Truncate to avoid errors.
    return pwd_context.hash(password[:72])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a limit of 72 bytes.
    return pwd_context.verify(plain_password[:72], hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_reset_token(email: str, expires_delta: Optional[timedelta] = None):
    to_encode = {"email": email}
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=1) # Reset tokens typically expire faster
    to_encode.update({"exp": expire, "type": "reset"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected '{token_type}'"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def get_current_user(token: str):
    # This function is usually a dependency in FastAPI,
    # but for simplicity, we'll define a placeholder here.
    # The actual implementation is in server.py's get_current_user_dep
    pass

def require_role(required_role: str, current_user_role: str):
    if current_user_role != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have the required role: {required_role}"
        )


# Example usage (not part of the FastAPI app directly)
if __name__ == "__main__":
    hashed = hash_password("mysecretpassword")
    print(f"Hashed password: {hashed}")
    print(f"Verify 'mysecretpassword': {verify_password('mysecretpassword', hashed)}")
    print(f"Verify 'wrongpassword': {verify_password('wrongpassword', hashed)}")

    access = create_access_token({"sub": "user123", "role": "admin"})
    refresh = create_refresh_token({"sub": "user123"})
    print(f"Access token: {access}")
    print(f"Refresh token: {refresh}")
    print(f"Verified access payload: {verify_token(access, 'access')}")
    print(f"Verified refresh payload: {verify_token(refresh, 'refresh')}")