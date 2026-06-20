"""
Central configuration for the attention service.

Environment is loaded once via load_environment() before the app serves traffic.
Do not read os.getenv at module import time in other modules — use helpers here.
"""
import logging
import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

ATTENTION_SERVICE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ATTENTION_SERVICE_DIR.parent

# Local override first, then shared backend .env (where DATABASE_URL typically lives).
ENV_FILE_CANDIDATES = [
    ATTENTION_SERVICE_DIR / ".env",
    PROJECT_ROOT / "backend" / ".env",
    PROJECT_ROOT / ".env",
]

_env_loaded = False
_env_path_loaded: Path | None = None
_engine: Engine | None = None


def load_environment() -> Path | None:
    """Load .env from the first matching absolute path. Safe to call once at startup."""
    global _env_loaded, _env_path_loaded

    if _env_loaded:
        return _env_path_loaded

    loaded_path: Path | None = None
    for candidate in ENV_FILE_CANDIDATES:
        if candidate.is_file():
            load_dotenv(candidate, override=True)
            loaded_path = candidate
            logger.info("Loaded environment from %s", candidate)

    _env_loaded = True
    _env_path_loaded = loaded_path
    return loaded_path


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"[CONFIG ERROR]\nMissing environment variable: {name}")
    return value


def get_database_url() -> str:
    return _require_env("DATABASE_URL")


def get_secret_key() -> str:
    return _require_env("SECRET_KEY")


def get_algorithm() -> str:
    return os.getenv("ALGORITHM", "HS256")


def mask_database_url(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.password:
        return url
    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    user = parsed.username or ""
    netloc = f"{user}:***@{host}{port}"
    return urlunparse(parsed._replace(netloc=netloc))


def validate_config() -> None:
    """Raise RuntimeError if required settings are missing."""
    load_environment()
    get_database_url()
    get_secret_key()
    get_algorithm()


def log_startup_config() -> None:
    load_environment()
    db_url = get_database_url()
    logger.info("Attention service configuration loaded")
    if _env_path_loaded:
        logger.info(".env path loaded: %s", _env_path_loaded)
    else:
        logger.warning(
            "No .env file found in: %s — using process environment only",
            ", ".join(str(p) for p in ENV_FILE_CANDIDATES),
        )
    logger.info("DATABASE_URL detected: %s", mask_database_url(db_url))
    logger.info("ALGORITHM: %s", get_algorithm())


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url())
    return _engine
