"""Authentication endpoints.

Local email + password. See `app/core/security.py` for what changes when you
move to Firebase or Supabase.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.ratelimit import RateLimit
from app.schemas.auth import (
    AuthSession,
    GoogleSignInRequest,
    SignInRequest,
    SignUpRequest,
    UserRead,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

# Throttle the credential endpoints: sign-up guards against spam accounts,
# sign-in against password brute force. Counts come from settings so a
# deployment can tighten them without a code change.
_signup_limit = RateLimit(settings.signup_rate_per_hour, 3600, scope="signup")
_signin_limit = RateLimit(settings.auth_rate_per_minute, 60, scope="signin")


@router.post(
    "/sign-up",
    response_model=AuthSession,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
    dependencies=[Depends(_signup_limit)],
)
async def sign_up(session: SessionDep, payload: SignUpRequest) -> AuthSession:
    user, token, expires_in = await auth_service.sign_up(
        session,
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
    )
    return AuthSession(
        access_token=token, expires_in=expires_in, user=UserRead.model_validate(user)
    )


@router.post(
    "/sign-in",
    response_model=AuthSession,
    summary="Sign in",
    dependencies=[Depends(_signin_limit)],
)
async def sign_in(session: SessionDep, payload: SignInRequest) -> AuthSession:
    user, token, expires_in = await auth_service.sign_in(
        session, email=payload.email, password=payload.password
    )
    return AuthSession(
        access_token=token, expires_in=expires_in, user=UserRead.model_validate(user)
    )


@router.post(
    "/google",
    response_model=AuthSession,
    summary="Sign in with Google",
    dependencies=[Depends(_signin_limit)],
)
async def google(session: SessionDep, payload: GoogleSignInRequest) -> AuthSession:
    """Exchange a Google ID token for a Selah session, creating the account on
    first sign-in. Enabled only when GOOGLE_CLIENT_ID is configured."""
    user, token, expires_in = await auth_service.google_sign_in(session, id_token=payload.id_token)
    return AuthSession(
        access_token=token, expires_in=expires_in, user=UserRead.model_validate(user)
    )


@router.get("/me", response_model=UserRead, summary="Current user")
async def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/sign-out", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
async def sign_out(user: CurrentUser) -> None:
    """No-op by design.

    Access tokens are stateless and short-lived; the client discards its copy.
    When you add refresh tokens, revoke them here.
    """
    return None
