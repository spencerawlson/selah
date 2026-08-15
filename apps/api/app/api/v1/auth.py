"""Authentication endpoints.

Local email + password. See `app/core/security.py` for what changes when you
move to Firebase or Supabase.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.auth import AuthSession, SignInRequest, SignUpRequest, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/sign-up",
    response_model=AuthSession,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
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


@router.post("/sign-in", response_model=AuthSession, summary="Sign in")
async def sign_in(session: SessionDep, payload: SignInRequest) -> AuthSession:
    user, token, expires_in = await auth_service.sign_in(
        session, email=payload.email, password=payload.password
    )
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
