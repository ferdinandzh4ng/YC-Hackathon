"""
Supabase client and auth helpers.
Uses service role for DB operations; verifies user JWT from Authorization header.
"""
import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

_security = HTTPBearer(auto_error=False)


def get_supabase_admin() -> Client:
    """Client with service role for backend-only operations (bypasses RLS)."""
    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    if not SUPABASE_URL or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env")
    return create_client(SUPABASE_URL, key)


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security)],
) -> str:
    """Verify Bearer token (Supabase JWT) and return user id. Raises 401 if invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set SUPABASE_JWT_SECRET in backend .env (Supabase Dashboard → Project Settings → API → JWT Secret)",
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return str(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired. Sign in again.")
    except jwt.InvalidTokenError as e:
        import logging
        logging.getLogger("auth").warning("JWT invalid: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e!s}. Check SUPABASE_JWT_SECRET matches Supabase → Project Settings → API → JWT Secret (no extra spaces/newlines).",
        )
