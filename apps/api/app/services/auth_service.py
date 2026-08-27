"""Sign-up, sign-in, and the demo account.

Local email+password only. When you switch `AUTH_PROVIDER`, the client obtains
its token from Firebase/Supabase instead of these endpoints and the rest of the
API is unaffected — `get_current_user` is the only other touchpoint.
"""

from __future__ import annotations

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AuthError, ConflictError, UpstreamError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

# Google validates the token's signature and expiry for us and echoes its claims.
_GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}

# Seeded so a fresh clone has data to look at. Local/dev only — `seed.py`
# refuses to create it outside the local environment.
DEMO_EMAIL = "demo@selah.app"
DEMO_PASSWORD = "selah-demo-2024"


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(func.lower(User.email) == email.lower()))


async def sign_up(
    session: AsyncSession, *, email: str, password: str, display_name: str
) -> tuple[User, str, int]:
    """Create an account. Returns `(user, access_token, expires_in_seconds)`."""
    if await get_user_by_email(session, email) is not None:
        raise ConflictError("An account with that email already exists.")

    user = User(
        email=email.lower(),
        display_name=display_name.strip(),
        hashed_password=hash_password(password),
        auth_provider="local",
    )
    session.add(user)
    await session.flush()
    return user, *_issue(user)


async def sign_in(session: AsyncSession, *, email: str, password: str) -> tuple[User, str, int]:
    user = await get_user_by_email(session, email)

    # Same message either way: do not confirm which emails have accounts.
    if user is None or not verify_password(password, user.hashed_password):
        raise AuthError("Incorrect email or password.")
    if not user.is_active:
        raise AuthError("This account has been deactivated.")

    return user, *_issue(user)


async def _verify_google_token(id_token: str) -> dict[str, str]:
    """Validate a Google ID token via Google's tokeninfo endpoint.

    Returns the token's claims, or raises AuthError. Google checks the signature
    and expiry; we check the audience and issuer are ours.
    """
    if not settings.google_client_id:
        raise AuthError("Google sign-in is not configured on the server.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(_GOOGLE_TOKENINFO, params={"id_token": id_token})
    except httpx.HTTPError as exc:
        raise UpstreamError("Could not reach Google to verify your sign-in.") from exc

    if response.status_code != 200:
        raise AuthError("Your Google sign-in could not be verified.")
    claims = response.json()

    if claims.get("aud") != settings.google_client_id:
        raise AuthError("This Google sign-in was issued for a different app.")
    if claims.get("iss") not in _GOOGLE_ISSUERS:
        raise AuthError("Unexpected Google token issuer.")
    if str(claims.get("email_verified", "")).lower() != "true":
        raise AuthError("Your Google email address is not verified.")
    if not claims.get("email"):
        raise AuthError("Google did not share an email address.")
    return claims


async def google_sign_in(session: AsyncSession, *, id_token: str) -> tuple[User, str, int]:
    """Sign in (or transparently create) an account from a Google ID token."""
    claims = await _verify_google_token(id_token)
    email = claims["email"].lower()

    user = await get_user_by_email(session, email)
    if user is None:
        # Google verified the email, so a first-time sign-in creates the account.
        user = User(
            email=email,
            display_name=(claims.get("name") or email.split("@")[0]).strip()[:80] or "Reader",
            hashed_password=None,
            auth_provider="google",
            external_id=claims.get("sub"),
        )
        session.add(user)
        await session.flush()
    elif not user.is_active:
        raise AuthError("This account has been deactivated.")

    return user, *_issue(user)


def _issue(user: User) -> tuple[str, int]:
    token = create_access_token(user.id, extra_claims={"email": user.email})
    return token, settings.access_token_ttl_minutes * 60
