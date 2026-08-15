"""Auth request/response models."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserRead(ORMModel):
    id: str
    email: str
    display_name: str
    is_premium: bool
    auth_provider: str


class AuthSession(BaseModel):
    """What the mobile app stores after sign-in."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Seconds until the access token expires.")
    user: UserRead
