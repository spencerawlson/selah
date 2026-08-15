"""Sign-up, sign-in, and the demo account.

Local email+password only. When you switch `AUTH_PROVIDER`, the client obtains
its token from Firebase/Supabase instead of these endpoints and the rest of the
API is unaffected — `get_current_user` is the only other touchpoint.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AuthError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

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


def _issue(user: User) -> tuple[str, int]:
    token = create_access_token(user.id, extra_claims={"email": user.email})
    return token, settings.access_token_ttl_minutes * 60
