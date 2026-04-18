from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict
from datetime import datetime
from app.database import get_database
from app.schemas.schemas import ChoferResponse, UbicacionUpdate, BadgeService, BadgeEnum

router = APIRouter(prefix="/choferes", tags=["choferes"])

# Gestor de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.chofer_locations: Dict[str, dict] = {}

    async def connect(self, chofer_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[chofer_id] = websocket
        # Actualizar estado del chofer a activo
        db = get_database()
        await db.choferes.update_one(
            {"_id": chofer_id},
            {"$set": {"activo": True, "ultima_actualizacion": datetime.utcnow()}}
        )

    def disconnect(self, chofer_id: str):
        if chofer_id in self.active_connections:
            del self.active_connections[chofer_id]
        if chofer_id in self.chofer_locations:
            del self.chofer_locations[chofer_id]
        # Actualizar estado del chofer a inactivo
        db = get_database()
        db.choferes.update_one(
            {"_id": chofer_id},
            {"$set": {"activo": False}}
        )

    async def update_location(self, chofer_id: str, lat: float, lng: float):
        self.chofer_locations[chofer_id] = {"lat": lat, "lng": lng, "updated_at": datetime.utcnow()}
        # Guardar en MongoDB
        db = get_database()
        await db.choferes.update_one(
            {"_id": chofer_id},
            {"$set": {"lat": lat, "lng": lng, "ultima_actualizacion": datetime.utcnow()}}
        )

manager = ConnectionManager()

@router.websocket("/ws/{chofer_id}")
async def websocket_endpoint(websocket: WebSocket, chofer_id: str):
    """Endpoint WebSocket para comunicación en tiempo real con el chofer."""
    await manager.connect(chofer_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "location":
                await manager.update_location(
                    chofer_id,
                    data.get("lat", 0),
                    data.get("lng", 0)
                )
                # Notificar a pasajeros con viajes activos
                await notify_passengers_location(chofer_id, data.get("lat", 0), data.get("lng", 0))
    except WebSocketDisconnect:
        manager.disconnect(chofer_id)

async def notify_passengers_location(chofer_id: str, lat: float, lng: float):
    """Notifica a los pasajeros del viaje activo sobre la ubicación del chofer."""
    # Esta función se implementará con el router de viajes
    pass

@router.post("/ubicacion")
async def actualizar_ubicacion(update: UbicacionUpdate):
    """Actualizar ubicación de un chofer (alternativa HTTP)."""
    await manager.update_location(update.chofer_id, update.lat, update.lng)
    return {"status": "ok", "lat": update.lat, "lng": update.lng}

@router.get("/disponibles")
async def get_choferes_disponibles():
    """Obtener lista de choferes disponibles con su ubicación."""
    db = get_database()
    cursor = db.choferes.find({"activo": True, "lat": {"$ne": None}, "lng": {"$ne": None}})
    choferes = []
    async for chofer in cursor:
        chofer["id"] = str(chofer.pop("_id"))
        del chofer["password_hash"]
        choferes.append(ChoferResponse(**chofer))
    return choferes

@router.get("/{chofer_id}/ganancias")
async def get_ganancias_chofer(chofer_id: str, dias: int = 7):
    """Obtener ganancias del chofer por día."""
    from datetime import timedelta
    db = get_database()

    fecha_inicio = datetime.utcnow() - timedelta(days=dias)

    pipeline = [
        {
            "$match": {
                "chofer_id": chofer_id,
                "estado": "finalizado",
                "created_at": {"$gte": fecha_inicio}
            }
        },
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "viajes": {"$sum": 1},
                "ganancia": {"$sum": "$tarifa_total"}
            }
        },
        {"$sort": {"_id": -1}}
    ]

    resultados = []
    async for doc in db.viajes.aggregate(pipeline):
        resultados.append({
            "fecha": doc["_id"],
            "viajes": doc["viajes"],
            "ganancia": round(doc["ganancia"], 2)
        })

    return resultados

@router.post("/{chofer_id}/activar")
async def activar_chofer(chofer_id: str, lat: float = None, lng: float = None):
    """Activar un chofer (conectar)."""
    db = get_database()
    update_data = {"activo": True, "ultima_actualizacion": datetime.utcnow()}
    if lat is not None and lng is not None:
        update_data["lat"] = lat
        update_data["lng"] = lng

    await db.choferes.update_one({"_id": chofer_id}, {"$set": update_data})
    return {"status": "activado"}

@router.post("/{chofer_id}/desactivar")
async def desactivar_chofer(chofer_id: str):
    """Desactivar un chofer (desconectar)."""
    db = get_database()
    await db.choferes.update_one(
        {"_id": chofer_id},
        {"$set": {"activo": False, "lat": None, "lng": None}}
    )
    return {"status": "desactivado"}
