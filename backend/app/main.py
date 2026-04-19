from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import auth, productos, cotizaciones, superadmin

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173", "https://ferrestock.mx"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/v1")
app.include_router(productos.router,  prefix="/api/v1")
app.include_router(cotizaciones.router, prefix="/api/v1")
app.include_router(superadmin.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": settings.APP_VERSION}
