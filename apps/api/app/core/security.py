"""Password hashing and token issue/verify.

This is a working skeleton, not a finished auth system. Two deliberate choices:

* **PBKDF2-HMAC-SHA256 from the standard library** rather than bcrypt/argon2, so
  the scaffold installs cleanly everywhere. It is a real KDF with a real work
  factor — fine for development, and the single function to replace when you
  harden for production.
* **Provider-shaped verification.** `verify_access_token` dispatches on
  `AUTH_PROVIDER`, so moving to Firebase or Supabase means implementing one
  function here; nothing above this layer changes.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings
from app.core.errors import AuthError

# OWASP's 2023 floor for PBKDF2-HMAC-SHA256. Old hashes still verify — the round
# count is read back from each stored hash — so raising this is backward safe.
_PBKDF2_ROUNDS = 600_000
_SALT_BYTES = 16


# --------------------------------------------------------------------------
# Passwords (local provider only)
# --------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Return `pbkdf2_sha256$<rounds>$<salt_hex>$<hash_hex>`."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, rounds, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
    except (ValueError, TypeError):
        return False
    # Constant-time: never leak how much of the hash matched.
    return hmac.compare_digest(candidate.hex(), digest_hex)


# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------
def create_access_token(user_id: str, *, extra_claims: dict[str, Any] | None = None) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
        "iss": settings.app_name,
        **(extra_claims or {}),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_access_token(token: str) -> dict[str, Any]:
    """Validate a bearer token and return its claims.

    Raises `AuthError` on anything that is not a valid, unexpired token we issued.
    """
    if settings.auth_provider == "local":
        try:
            return jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                issuer=settings.app_name,
            )
        except jwt.ExpiredSignatureError as exc:
            raise AuthError("Your session has expired. Please sign in again.") from exc
        except jwt.PyJWTError as exc:
            raise AuthError("Invalid authentication token.") from exc

    # --- Hosted providers -------------------------------------------------
    # Both Firebase and Supabase hand the client a JWT; the server verifies it
    # against the provider's public keys (JWKS) and reads `sub`/`email` from the
    # claims. Implement here, keep the return shape, and every route keeps
    # working untouched.
    #
    #   firebase: verify RS256 against
    #     https://www.googleapis.com/service_accounts/v1/cert/securetoken@system.gserviceaccount.com
    #     audience = your Firebase project id
    #   supabase: verify against <project>.supabase.co/auth/v1/.well-known/jwks.json
    #
    # Cache the JWKS (they rotate slowly) and fail closed.
    raise AuthError(
        f"AUTH_PROVIDER='{settings.auth_provider}' is not implemented yet. "
        "See app/core/security.py:verify_access_token."
    )
