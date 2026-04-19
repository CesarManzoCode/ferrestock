from sqlmodel import create_engine, Session, SQLModel
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,          # detecta conexiones muertas antes de usarlas
    pool_size=10,
    max_overflow=20,
)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
