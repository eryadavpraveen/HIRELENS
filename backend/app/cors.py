"""CORS helpers for local dev and free-host production (Vercel, Render, etc.)."""
import os
import re

_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

# Common free static hosts + Render
_ORIGIN_REGEX = re.compile(
    r"^https?://("
    r"localhost|127\.0\.0\.1"
    r")(:\d+)?$"
    r"|^https://[a-zA-Z0-9-]+\.vercel\.app$"
    r"|^https://[a-zA-Z0-9-]+\.netlify\.app$"
    r"|^https://[a-zA-Z0-9-]+\.onrender\.com$"
)


def build_cors_config() -> tuple[list[str], str | None]:
    origins = list(_LOCAL_ORIGINS)

    frontend = os.getenv("FRONTEND_URL", "").strip()
    if frontend:
        origins.append(frontend.rstrip("/"))

    extra = os.getenv("CORS_ORIGINS", "")
    for item in extra.split(","):
        item = item.strip().rstrip("/")
        if item:
            origins.append(item)

    # Dedupe while preserving order
    seen = set()
    unique = []
    for o in origins:
        if o not in seen:
            seen.add(o)
            unique.append(o)

    regex = os.getenv("CORS_ORIGIN_REGEX")
    if regex:
        return unique, regex

    return unique, _ORIGIN_REGEX.pattern
