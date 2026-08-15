"""Shared FastAPI dependencies.

Annotated aliases (`SessionDep`, `CurrentUser`) keep handler signatures readable
and make the auth requirement obvious at a glance.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthError
from app.core.security import verify_access_token
from app.db.session import get_session
from app.models.user import User

SessionDep = Annotated[AsyncSession, Depends(get_session)]

# auto_error=False so we can raise our own error envelope instead of Starlette's.
_bearer = HTTPBearer(auto_error=False, description="Bearer token from /auth/sign-in")
_CredentialsDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


async def get_current_user(session: SessionDep, credentials: _CredentialsDep) -> User:
    """Resolve the signed-in user, or 401."""
    if credentials is None or not credentials.credentials:
        raise AuthError("Sign in to continue.")

    claims = verify_access_token(credentials.credentials)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthError("Invalid authentication token.")

    user = await session.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthError("This account is no longer available.")
    return user


async def get_optional_user(session: SessionDep, credentials: _CredentialsDep) -> User | None:
    """For endpoints that are public but personalise when signed in."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        return await get_current_user(session, credentials)
    except AuthError:
        return None


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


class Pagination:
    """Offset pagination with a hard ceiling, so no client can ask for everything."""

    def __init__(
        self,
        limit: Annotated[int, Query(ge=1, le=100, description="Max rows to return.")] = 50,
        offset: Annotated[int, Query(ge=0, description="Rows to skip.")] = 0,
    ) -> None:
        self.limit = limit
        self.offset = offset


PageParams = Annotated[Pagination, Depends(Pagination)]
