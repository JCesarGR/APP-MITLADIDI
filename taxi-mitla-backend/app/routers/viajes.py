from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
from datetime import datetime
from app.database import get_database
from app.schemas.schemas import (
    ViajeCreate, ViajeResponse, ViajeUpdate, EstadoViajeEnum,
    TarifaService, AsignacionService, ChoferResponse
)
from app.routers.choferes import manager

router = APIRouter(prefix="/viajes", tags=["viajes"])

# Cola de viajes pendientes
viajes_pendientes: Dict[str, dict] = {}

class ViajeConnectionManager:
    def __init__(self):
        self.passenger_connections: Dict[str, WebSocket] = {}

    async def connect_passenger(self, viaje_id: str, websocket: WebSocket):
        await websocket.accept()
        self.passenger_connections[viaje_id] = websocket

    def disconnect_passenger(self, viaje_id: str):
        if viaje_id in self.passenger_connections:
            del self.passenger_connections[viaje_id]

    async def notify_passenger(self, viaje_id: str, data: dict):
        if viaje_id in self.passenger_connections:
            await self.passenger_connections[viaje_id].send_json(data)

viaje_manager = ViajeConnectionManager()

@router.post("/", response_model=ViajeResponse)
async def crear_viaje(viaje: ViajeCreate):
    """Crear un nuevo viaje y asignar chofer automáticamente."""
    db = get_database()

    # Calcular distancia y tarifa
    distancia = 5.0  #默认值，可以后续优化

    # Obtener choferes disponibles
    cursor = db.choferes.find({
        "activo": True,
        "lat": {"$ne": None},
        "lng": {"$ne": None}
    })
    choferes_disponibles = []
    async for chofer in cursor:
        choferes_disponibles.append(chofer)

    # Asignar chofer más cercano
    chofer_asignado = AsignacionService.asignar_chofer_mas_cercano(
        choferes_disponibles,
        viaje.origen.lat,
        viaje.origen.lng
    )

    # Calcular tarifa
    es_nocturno = TarifaService.es_hora_nocturna()
    es_dia_plaza = TarifaService.es_dia_plaza()
    tarifa_info = TarifaService.calcular_tarifa(
        viaje.destino_zona, distancia, es_nocturno, es_dia_plaza
    )

    # Crear viaje
    viaje_dict = {
        "pasajero_nombre": viaje.pasajero_nombre,
        "pasajero_telefono": viaje.pasajero_telefono,
        "origen": viaje.origen.dict(),
        "destino_zona": viaje.destino_zona.value,
        "destino": viaje.destino.dict(),
        "chofer_id": chofer_asignado["_id"] if chofer_asignado else None,
        "estado": EstadoViajeEnum.SOLICITADO.value,
        "distancia_km": distancia,
        "tarifa_base": tarifa_info["tarifa_base"],
        "recargo_nocturno": tarifa_info["recargo_nocturno"],
        "recargo_plaza": tarifa_info["recargo_plaza"],
        "tarifa_total": tarifa_info["tarifa_total"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.viajes.insert_one(viaje_dict)
    viaje_id = str(result.inserted_id)

    # Notificar al chofer asignado
    if chofer_asignado:
        if chofer_asignado["_id"] in manager.active_connections:
            await manager.active_connections[chofer_asignado["_id"]].send_json({
                "type": "nuevo_viaje",
                "viaje_id": viaje_id,
                "pasajero_nombre": viaje.pasajero_nombre,
                "origen": viaje.origen.dict(),
                "destino_zona": viaje.destino_zona.value,
                "tarifa": tarifa_info["tarifa_total"]
            })

    # Preparar respuesta
    viaje_dict["id"] = viaje_id
    if chofer_asignado:
        chofer_asignado["id"] = str(chofer_asignado.pop("_id"))
        del chofer_asignado["password_hash"]
        viaje_dict["chofer"] = chofer_asignado
    else:
        viaje_dict["chofer"] = None

    return ViajeResponse(**viaje_dict)

@router.get("/{viaje_id}", response_model=ViajeResponse)
async def get_viaje(viaje_id: str):
    """Obtener detalles de un viaje."""
    db = get_database()
    viaje = await db.viajes.find_one({"_id": viaje_id})
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    viaje["id"] = str(viaje.pop("_id"))

    # Obtener info del chofer si existe
    if viaje.get("chofer_id"):
        chofer = await db.choferes.find_one({"_id": viaje["chofer_id"]})
        if chofer:
            chofer["id"] = str(chofer.pop("_id"))
            del chofer["password_hash"]
            viaje["chofer"] = chofer
        else:
            viaje["chofer"] = None
    else:
        viaje["chofer"] = None

    return ViajeResponse(**viaje)

@router.put("/{viaje_id}/estado")
async def actualizar_estado_viaje(viaje_id: str, update: ViajeUpdate):
    """Actualizar el estado de un viaje."""
    db = get_database()

    viaje = await db.viajes.find_one({"_id": viaje_id})
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    # Validar transición de estado
    estado_actual = viaje.get("estado")
    nuevo_estado = update.estado

    # Actualizar viaje
    await db.viajes.update_one(
        {"_id": viaje_id},
        {"$set": {"estado": nuevo_estado.value, "updated_at": datetime.utcnow()}}
    )

    # Si se finaliza, actualizar ganancias del chofer
    if nuevo_estado == EstadoViajeEnum.FINALIZADO and viaje.get("chofer_id"):
        chofer_id = viaje["chofer_id"]
        ganancia = viaje["tarifa_total"]

        # Actualizar chofer
        chofer = await db.choferes.find_one_and_update(
            {"_id": chofer_id},
            {
                "$inc": {
                    "viajes_completados": 1,
                    "ganancia_total": ganancia
                }
            },
            return_document=True
        )

        # Actualizar badge
        nuevo_badge = AsignacionService.calcular_badge(chofer["viajes_completados"])
        if chofer.get("badge") != nuevo_badge:
            await db.choferes.update_one(
                {"_id": chofer_id},
                {"$set": {"badge": nuevo_badge.value}}
            )

    # Notificar al pasajero via WebSocket
    await viaje_manager.notify_passenger(viaje_id, {
        "type": "estado_actualizado",
        "estado": nuevo_estado.value
    })

    return {"status": "ok", "nuevo_estado": nuevo_estado.value}

@router.get("/{viaje_id}/tracking")
async def get_tracking_viaje(viaje_id: str):
    """Obtener ubicación actual del chofer para tracking."""
    db = get_database()
    viaje = await db.viajes.find_one({"_id": viaje_id})
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    chofer_ubicacion = None
    if viaje.get("chofer_id"):
        chofer = await db.choferes.find_one({"_id": viaje["chofer_id"]})
        if chofer:
            chofer_ubicacion = {
                "lat": chofer.get("lat"),
                "lng": chofer.get("lng"),
                "nombre": chofer.get("nombre"),
                "unidad": chofer.get("unidad"),
                "badge": chofer.get("badge")
            }

    return {
        "viaje_id": viaje_id,
        "estado": viaje.get("estado"),
        "chofer": chofer_ubicacion,
        "updated_at": viaje.get("updated_at")
    }

@router.post("/{viaje_id}/websocket")
async def connect_tracking_websocket(viaje_id: str, websocket: WebSocket):
    """Conectar WebSocket para tracking en tiempo real."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Reenviar actualización de ubicación
            if data.get("type") == "location_update":
                await viaje_manager.notify_passenger(viaje_id, data)
    except WebSocketDisconnect:
        viaje_manager.disconnect_passenger(viaje_id)
