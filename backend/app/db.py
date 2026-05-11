from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.settings import settings


def _sqlite_url() -> str:
    p = Path(settings.sqlite_path)
    if not p.is_absolute():
        p = Path(__file__).resolve().parent.parent / p  # backend/app/.. -> backend/
    p.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{p.as_posix()}"


engine = create_engine(
    _sqlite_url(),
    # timeout: tiempo que las lecturas/escrituras esperan si la BD está bloqueada (ms)
    connect_args={"check_same_thread": False, "timeout": 30.0},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):
    # Reducir "database is locked" en escrituras concurrentes.
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.close()
    except Exception:
        pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_sqlite_schema() -> None:
    """
    SQLite no soporta ALTER automático via `create_all()`.
    Esta función agrega columnas faltantes de forma no destructiva.
    """

    # Solo aplica a sqlite; si en el futuro se cambia de motor, se puede no-op.
    if engine.dialect.name != "sqlite":
        return

    desired_columns: dict[str, str] = {
        # columnas agregadas en versiones posteriores del modelo `Alert`
        "os": "ALTER TABLE alerts ADD COLUMN os VARCHAR(128) NOT NULL DEFAULT ''",
        "nic_vendor": "ALTER TABLE alerts ADD COLUMN nic_vendor VARCHAR(128) NOT NULL DEFAULT ''",
        "assigned_labels": "ALTER TABLE alerts ADD COLUMN assigned_labels TEXT NOT NULL DEFAULT ''",
        "raw_subject": "ALTER TABLE alerts ADD COLUMN raw_subject TEXT NOT NULL DEFAULT ''",
        "raw_body_preview": "ALTER TABLE alerts ADD COLUMN raw_body_preview TEXT NOT NULL DEFAULT ''",
    }

    with engine.begin() as conn:
        # Si la tabla no existe aún, `create_all()` la creará con el esquema completo.
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='alerts'")
        ).fetchone()
        if not table_exists:
            return

        existing = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info('alerts')")).fetchall()
        }  # PRAGMA table_info: (cid, name, type, notnull, dflt_value, pk)

        for col, ddl in desired_columns.items():
            if col not in existing:
                conn.execute(text(ddl))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

