from app.routers.auth import router as auth_router
from app.routers.choferes import router as choferes_router
from app.routers.viajes import router as viajes_router
from app.routers.tarifas import router as tarifas_router
from app.routers.admin import router as admin_router

__all__ = ["auth_router", "choferes_router", "viajes_router", "tarifas_router", "admin_router"]
