from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Optional, List
import hashlib
import secrets

from ..database import get_database
from ..schemas.admin_schemas import (
    AdminUserCreate, AdminUserResponse, AdminToken, AdminUserLogin,
    DashboardStats, StatsViajes, StatsIngresos, StatsChoferes,
    ConfigTarifaResponse, ZonaConfig, ConfigTarifaUpdate,
    ViajeAdminDetail, ChoferAdminDetail, ChoferStatusUpdate,
    NotificacionCreate, AdminRole
)

router = APIRouter(prefix="/admin", tags=["admin"])

# In-memory admin storage (in production, use MongoDB)
admin_users_db = {}
admin_tokens = {}

# Tarifa configuration storage
tarifa_config = {
    "centro": {"zona": "centro", "tarifa_base": 25.0, "recargo_nocturno_porcentaje": 20, "recargo_plaza_porcentaje": 50, "precio_km_adicional": 8.0, "activa": True},
    "ruinas": {"zona": "ruinas", "tarifa_base": 35.0, "recargo_nocturno_porcentaje": 20, "recargo_plaza_porcentaje": 50, "precio_km_adicional": 10.0, "activa": True},
    "periferia": {"zona": "periferia", "tarifa_base": 45.0, "recargo_nocturno_porcentaje": 20, "recargo_plaza_porcentaje": 50, "precio_km_adicional": 10.0, "activa": True},
    "foraneo": {"zona": "foraneo", "tarifa_base": 60.0, "recargo_nocturno_porcentaje": 20, "recargo_plaza_porcentaje": 50, "precio_km_adicional": 12.0, "activa": True},
}
tarifa_config_timestamp = datetime.utcnow()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def create_admin_token() -> str:
    return secrets.token_urlsafe(32)


async def get_current_admin(
    authorization: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> AdminUserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado"
        )

    token = authorization.replace("Bearer ", "")
    if token not in admin_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )

    admin_data = admin_tokens[token]
    return AdminUserResponse(**admin_data)


@router.post("/register", response_model=AdminUserResponse)
async def register_admin(admin: AdminUserCreate):
    """Registrar un nuevo administrador (solo super_admin puede hacerlo)"""
    # Check if username exists
    for user in admin_users_db.values():
        if user["username"] == admin.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario ya existe"
            )

    admin_id = secrets.token_urlsafe(16)
    admin_data = {
        "id": admin_id,
        "username": admin.username,
        "email": admin.email,
        "password": hash_password(admin.password),
        "rol": admin.rol.value if isinstance(admin.rol, AdminRole) else admin.rol,
        "creado_en": datetime.utcnow(),
        "ultimo_login": None
    }
    admin_users_db[admin_id] = admin_data

    return AdminUserResponse(**{**admin_data, "creado_en": admin_data["creado_en"]})


@router.post("/login", response_model=AdminToken)
async def login_admin(form_data: OAuth2PasswordRequestForm = Depends()):
    """Iniciar sesión como administrador"""
    # Find user by username
    admin_data = None
    for user in admin_users_db.values():
        if user["username"] == form_data.username:
            admin_data = user
            break

    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    if not verify_password(form_data.password, admin_data["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    # Update last login
    admin_data["ultimo_login"] = datetime.utcnow()

    # Create token
    token = create_admin_token()
    admin_tokens[token] = admin_data

    return AdminToken(
        access_token=token,
        admin=AdminUserResponse(
            id=admin_data["id"],
            username=admin_data["username"],
            email=admin_data["email"],
            rol=admin_data["rol"],
            creado_en=admin_data["creado_en"],
            ultimo_login=admin_data["ultimo_login"]
        )
    )


@router.post("/logout")
async def logout_admin(authorization: str = Depends(lambda authorization: authorization)):
    """Cerrar sesión"""
    token = authorization.replace("Bearer ", "") if authorization else None
    if token and token in admin_tokens:
        del admin_tokens[token]
    return {"message": "Sesión cerrada correctamente"}


# =====================
# DASHBOARD Y ESTADÍSTICAS
# =====================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Obtener estadísticas del dashboard"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    # Viajes stats
    total_viajes = await db.viajes.count_documents({})
    completados = await db.viajes.count_documents({"estado": "finalizado"})
    cancelados = await db.viajes.count_documents({"estado": {"$in": ["cancelado_por_pasajero", "cancelado_por_chofer"]}})
    en_progreso = total_viajes - completados - cancelados

    # Ingresos stats
    pipeline_ingresos = [
        {"$match": {"estado": "finalizado", "tarifa_total": {"$exists": True}}},
        {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
    ]
    result_ingresos = await db.viajes.aggregate(pipeline_ingresos).to_list(1)
    total_ingresos = result_ingresos[0]["total"] if result_ingresos else 0
    promedio = total_ingresos / completados if completados > 0 else 0

    # Ingresos por período
    pipeline_hoy = [
        {"$match": {"estado": "finalizado", "finalizado_en": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
    ]
    result_hoy = await db.viajes.aggregate(pipeline_hoy).to_list(1)
    ingresos_hoy = result_hoy[0]["total"] if result_hoy else 0

    pipeline_semana = [
        {"$match": {"estado": "finalizado", "finalizado_en": {"$gte": week_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
    ]
    result_semana = await db.viajes.aggregate(pipeline_semana).to_list(1)
    ingresos_semana = result_semana[0]["total"] if result_semana else 0

    pipeline_mes = [
        {"$match": {"estado": "finalizado", "finalizado_en": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
    ]
    result_mes = await db.viajes.aggregate(pipeline_mes).to_list(1)
    ingresos_mes = result_mes[0]["total"] if result_mes else 0

    # Choferes stats
    total_choferes = await db.choferes.count_documents({})

    pipeline_activos = [
        {"$match": {"activo": True}},
        {"$count": "count"}
    ]
    result_activos = await db.choferes.aggregate(pipeline_activos).to_list(1)
    activos = result_activos[0]["count"] if result_activos else 0

    # Badges distribution
    pipeline_badges = [
        {"$group": {"_id": "$badge", "count": {"$sum": 1}}}
    ]
    badges_result = await db.choferes.aggregate(pipeline_badges).to_list(10)
    badges_dist = {item["_id"] or "sin_badge": item["count"] for item in badges_result}

    return DashboardStats(
        viajes=StatsViajes(
            total=total_viajes,
            completados=completados,
            cancelados=cancelados,
            en_progreso=en_progreso
        ),
        ingresos=StatsIngresos(
            total_mxn=total_ingresos,
            promedio_por_viaje=promedio,
            hoy=ingresos_hoy,
            esta_semana=ingresos_semana,
            este_mes=ingresos_mes
        ),
        choferes=StatsChoferes(
            total=total_choferes,
            activos=activos,
            inactivos=total_choferes - activos,
            por_badge=badges_dist
        ),
        timestamp=now
    )


# =====================
# GESTIÓN DE TARIFAS
# =====================

@router.get("/tarifas", response_model=ConfigTarifaResponse)
async def get_tarifas(
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Obtener configuración de tarifas"""
    return ConfigTarifaResponse(
        zonas=[ZonaConfig(**config) for config in tarifa_config.values()],
        ultima_actualizacion=tarifa_config_timestamp
    )


@router.put("/tarifas/{zona}", response_model=ZonaConfig)
async def update_tarifa(
    zona: str,
    config: ConfigTarifaUpdate,
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Actualizar configuración de una zona"""
    if zona not in tarifa_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zona '{zona}' no encontrada"
        )

    global tarifa_config_timestamp
    update_data = config.dict(exclude_unset=True)
    tarifa_config[zona].update(update_data)
    tarifa_config_timestamp = datetime.utcnow()

    return ZonaConfig(**tarifa_config[zona])


# =====================
# GESTIÓN DE VIAJES
# =====================

@router.get("/viajes", response_model=List[ViajeAdminDetail])
async def list_viajes(
    estado: Optional[str] = None,
    chofer_id: Optional[str] = None,
    limite: int = 50,
    offset: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Listar viajes con filtros"""
    query = {}
    if estado:
        query["estado"] = estado
    if chofer_id:
        query["chofer_id"] = chofer_id

    viajes = await db.viajes.find(query).sort("creado_en", -1).skip(offset).limit(limite).to_list(limite)

    result = []
    for viaje in viajes:
        chofer = None
        if viaje.get("chofer_id"):
            chofer = await db.choferes.find_one({"_id": viaje["chofer_id"]})

        result.append(ViajeAdminDetail(
            id=str(viaje["_id"]),
            pasajero_nombre=viaje.get("pasajero_nombre", ""),
            pasajero_telefono=viaje.get("pasajero_telefono", ""),
            origen=viaje.get("origen", {}),
            destino_zona=viaje.get("destino_zona", ""),
            destino=viaje.get("destino", {}),
            estado=viaje.get("estado", ""),
            tarifa_total=viaje.get("tarifa_total", 0),
            distancia_km=viaje.get("distancia_km", 0),
            chofer_id=viaje.get("chofer_id"),
            chofer_nombre=chofer.get("nombre") if chofer else None,
            badge_chofer=chofer.get("badge") if chofer else None,
            creado_en=viaje.get("creado_en", datetime.utcnow()),
            iniciado_en=viaje.get("iniciado_en"),
            finalizado_en=viaje.get("finalizado_en")
        ))

    return result


@router.get("/viajes/{viaje_id}", response_model=ViajeAdminDetail)
async def get_viaje_detail(
    viaje_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Obtener detalle de un viaje"""
    from bson import ObjectId
    try:
        viaje = await db.viajes.find_one({"_id": ObjectId(viaje_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de viaje inválido")

    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")

    chofer = None
    if viaje.get("chofer_id"):
        chofer = await db.choferes.find_one({"_id": viaje["chofer_id"]})

    return ViajeAdminDetail(
        id=str(viaje["_id"]),
        pasajero_nombre=viaje.get("pasajero_nombre", ""),
        pasajero_telefono=viaje.get("pasajero_telefono", ""),
        origen=viaje.get("origen", {}),
        destino_zona=viaje.get("destino_zona", ""),
        destino=viaje.get("destino", {}),
        estado=viaje.get("estado", ""),
        tarifa_total=viaje.get("tarifa_total", 0),
        distancia_km=viaje.get("distancia_km", 0),
        chofer_id=viaje.get("chofer_id"),
        chofer_nombre=chofer.get("nombre") if chofer else None,
        badge_chofer=chofer.get("badge") if chofer else None,
        creado_en=viaje.get("creado_en", datetime.utcnow()),
        iniciado_en=viaje.get("iniciado_en"),
        finalizado_en=viaje.get("finalizado_en")
    )


# =====================
# GESTIÓN DE CHOFERES
# =====================

@router.get("/choferes", response_model=List[ChoferAdminDetail])
async def list_choferes(
    activo: Optional[bool] = None,
    badge: Optional[str] = None,
    limite: int = 50,
    offset: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Listar choferes con filtros"""
    query = {}
    if activo is not None:
        query["activo"] = activo
    if badge:
        query["badge"] = badge

    choferes = await db.choferes.find(query).sort("creado_en", -1).skip(offset).limit(limite).to_list(limite)

    result = []
    for chofer in choferes:
        # Calcular total de ingresos del chofer
        pipeline_ingresos = [
            {"$match": {"chofer_id": chofer["_id"], "estado": "finalizado"}},
            {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
        ]
        ing_result = await db.viajes.aggregate(pipeline_ingresos).to_list(1)
        total_ingresos = ing_result[0]["total"] if ing_result else 0

        # Último viaje
        ultimo = await db.viajes.find_one(
            {"chofer_id": chofer["_id"]},
            sort=[("creado_en", -1)]
        )

        result.append(ChoferAdminDetail(
            id=str(chofer["_id"]),
            nombre=chofer.get("nombre", ""),
            telefono=chofer.get("telefono", ""),
            email=chofer.get("email"),
            unidad=chofer.get("unidad", ""),
            badge=chofer.get("badge", "principiante"),
            badge_valor=chofer.get("badge_valor", 0),
            viajes_completados=chofer.get("viajes_completados", 0),
            calificacion_promedio=chofer.get("calificacion_promedio", 5.0),
            total_ingresos=total_ingresos,
            activo=chofer.get("activo", True),
            conectado=chofer.get("conectado", False),
            ubicacion_actual=chofer.get("ubicacion_actual"),
            creado_en=chofer.get("creado_en", datetime.utcnow()),
            ultimo_viaje=ultimo.get("creado_en") if ultimo else None
        ))

    return result


@router.get("/choferes/{chofer_id}", response_model=ChoferAdminDetail)
async def get_chofer_detail(
    chofer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Obtener detalle de un chofer"""
    from bson import ObjectId
    try:
        chofer = await db.choferes.find_one({"_id": ObjectId(chofer_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de chofer inválido")

    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")

    # Calcular total de ingresos
    pipeline_ingresos = [
        {"$match": {"chofer_id": chofer["_id"], "estado": "finalizado"}},
        {"$group": {"_id": None, "total": {"$sum": "$tarifa_total"}}}
    ]
    ing_result = await db.viajes.aggregate(pipeline_ingresos).to_list(1)
    total_ingresos = ing_result[0]["total"] if ing_result else 0

    # Último viaje
    ultimo = await db.viajes.find_one(
        {"chofer_id": chofer["_id"]},
        sort=[("creado_en", -1)]
    )

    return ChoferAdminDetail(
        id=str(chofer["_id"]),
        nombre=chofer.get("nombre", ""),
        telefono=chofer.get("telefono", ""),
        email=chofer.get("email"),
        unidad=chofer.get("unidad", ""),
        badge=chofer.get("badge", "principiante"),
        badge_valor=chofer.get("badge_valor", 0),
        viajes_completados=chofer.get("viajes_completados", 0),
        calificacion_promedio=chofer.get("calificacion_promedio", 5.0),
        total_ingresos=total_ingresos,
        activo=chofer.get("activo", True),
        conectado=chofer.get("conectado", False),
        ubicacion_actual=chofer.get("ubicacion_actual"),
        creado_en=chofer.get("creado_en", datetime.utcnow()),
        ultimo_viaje=ultimo.get("creado_en") if ultimo else None
    )


@router.put("/choferes/{chofer_id}/status")
async def update_chofer_status(
    chofer_id: str,
    status: ChoferStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Activar/desactivar un chofer"""
    from bson import ObjectId
    try:
        result = await db.choferes.update_one(
            {"_id": ObjectId(chofer_id)},
            {"$set": {"activo": status.activo}}
        )
    except:
        raise HTTPException(status_code=400, detail="ID de chofer inválido")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")

    return {"message": f"Chofer {'activado' if status.activo else 'desactivado'} correctamente"}


# =====================
# REPORTES
# =====================

@router.get("/reportes/ingresos")
async def get_reporte_ingresos(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Generar reporte de ingresos"""
    match_stage = {"estado": "finalizado"}

    if fecha_desde:
        match_stage["finalizado_en"] = {"$gte": datetime.fromisoformat(fecha_desde)}
    if fecha_hasta:
        if "finalizado_en" in match_stage:
            match_stage["finalizado_en"]["$lte"] = datetime.fromisoformat(fecha_hasta)
        else:
            match_stage["finalizado_en"] = {"$lte": datetime.fromisoformat(fecha_hasta)}

    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$finalizado_en"}},
            "total": {"$sum": "$tarifa_total"},
            "viajes": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]

    result = await db.viajes.aggregate(pipeline).to_list(365)
    return {"data": [{"fecha": r["_id"], "ingresos": r["total"], "viajes": r["viajes"]} for r in result]}


@router.get("/reportes/choferes-ranking")
async def get_ranking_choferes(
    limite: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: AdminUserResponse = Depends(get_current_admin)
):
    """Obtener ranking de choferes por ingresos"""
    pipeline = [
        {"$match": {"estado": "finalizado"}},
        {"$group": {
            "_id": "$chofer_id",
            "total_ingresos": {"$sum": "$tarifa_total"},
            "viajes": {"$sum": 1}
        }},
        {"$sort": {"total_ingresos": -1}},
        {"$limit": limite}
    ]

    result = await db.viajes.aggregate(pipeline).to_list(limite)

    # Obtener nombres de choferes
    ranking = []
    from bson import ObjectId
    for item in result:
        if item["_id"]:
            chofer = await db.choferes.find_one({"_id": item["_id"]})
            ranking.append({
                "chofer_id": str(item["_id"]),
                "nombre": chofer.get("nombre") if chofer else "Desconocido",
                "badge": chofer.get("badge") if chofer else "principiante",
                "total_ingresos": item["total_ingresos"],
                "viajes_completados": item["viajes"]
            })

    return {"ranking": ranking}
