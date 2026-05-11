from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_sqlite_path() -> str:
    """
    En Windows, evitar rutas bajo OneDrive para SQLite (puede causar locks/disk I/O).
    - Si existe `backend/data/nac.db`, mantenerlo por compatibilidad.
    - Si no, usar `%LOCALAPPDATA%\\NAC\\nac.db`.
    """

    repo_default = Path(__file__).resolve().parent.parent / "data" / "nac.db"  # backend/app/.. -> backend/data/nac.db
    if repo_default.exists():
        return str(repo_default)

    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return str(Path(local_app_data) / "NAC" / "nac.db")

    # fallback cross-platform
    return str(Path.home() / ".nac" / "nac.db")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NAC_", env_file=".env", extra="ignore")

    sqlite_path: str = _default_sqlite_path()
    # Permite ambas formas comunes de servir el frontend en desarrollo.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    outlook_account: str = "controlnac"
    # Incluye carpeta de confirmaciones para poder detectarlas,
    # aunque luego se filtre en los dashboards.
    outlook_folders: str = "MODERADA,BAJA,ALTA,CRITICA,EVENTO DE BLOQUEO,CONFIRMACION DE CUMPLIMIENTO"


settings = Settings()

