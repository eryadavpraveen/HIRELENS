from starlette.routing import WebSocketRoute, Mount

from app.main import app
from app.api.signaling import router as signaling_router

print("signaling_router.routes:", signaling_router.routes)
print("app route count:", len(app.routes))
for r in app.routes:
    name = type(r).__name__
    path = getattr(r, "path", None)
    if isinstance(r, Mount) and hasattr(r, "routes"):
        sub = [getattr(s, "path", None) for s in r.routes]
        print(name, path, "sub count:", len(r.routes), "first:", sub[:3])
    else:
        print(name, path)

ws = [r for r in app.routes if isinstance(r, WebSocketRoute)]
print("WebSocketRoute on app:", ws)
