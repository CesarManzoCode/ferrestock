from pydantic import BaseModel, EmailStr


class RegisterInput(BaseModel):
    nombre_negocio: str
    nombre_usuario: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshInput(BaseModel):
    refresh_token: str
