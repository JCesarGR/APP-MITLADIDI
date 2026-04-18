from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPPORT = "support"


class AdminUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    rol: AdminRole = AdminRole.ADMIN


class AdminUserLogin(BaseModel):
    username: str
    password: str


class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str
    rol: AdminRole
    creado_en: datetime
    ultimo_login: Optional[datetime] = None


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminUserResponse


class StatsViajes(BaseModel):
    total: int
    completados: int
    cancelados: int
    en_progreso: int


class StatsIngresos(BaseModel):
    total_mxn: float
    promedio_por_viaje: float
    hoy: float
    esta_semana: float
    este_mes: float


class StatsChoferes(BaseModel):
    total: int
    activos: int
    inactivos: int
    por_badge: dict


class DashboardStats(BaseModel):
    viajes: StatsViajes
    ingresos: StatsIngresos
    choferes: StatsChoferes
    timestamp: datetime


class ConfigTarifaUpdate(BaseModel):
    zona: str
    tarifa_base: float
    recargo_nocturno_porcentaje: Optional[float] = None
    recargo_plaza_porcentaje: Optional[float] = None
    precio_km_adicional: Optional[float] = None
    activa: bool = True


class ZonaConfig(BaseModel):
    zona: str
    tarifa_base: float
    recargo_nocturno_porcentaje: float
    recargo_plaza_porcentaje: float
    precio_km_adicional: float
    activa: bool


class ConfigTarifaResponse(BaseModel):
    zonas: List[ZonaConfig]
    ultima_actualizacion: datetime


class ViajeAdminDetail(BaseModel):
    id: str
    pasajero_nombre: str
    pasajero_telefono: str
    origen: dict
    destino_zona: str
    destino: dict
    estado: str
    tarifa_total: float
    distancia_km: float
    chofer_id: Optional[str] = None
    chofer_nombre: Optional[str] = None
    badge_chofer: Optional[str] = None
    creado_en: datetime
    iniciado_en: Optional[datetime] = None
    finalizado_en: Optional[datetime] = None


class ViajesFilter(BaseModel):
    estado: Optional[str] = None
    chofer_id: Optional[str] = None
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    zona: Optional[str] = None


class ChoferAdminDetail(BaseModel):
    id: str
    nombre: str
    telefono: str
    email: Optional[str] = None
    unidad: str
    badge: str
    badge_valor: int
    viajes_completados: int
    calificacion_promedio: float
    total_ingresos: float
    activo: bool
    conectado: bool
    ubicacion_actual: Optional[dict] = None
    creado_en: datetime
    ultimo_viaje: Optional[datetime] = None


class ChoferStatusUpdate(BaseModel):
    activo: bool


class NotificacionCreate(BaseModel):
    titulo: str
    mensaje: str
    tipo: str = "info"  # info, warning, error, success
    para_todos: bool = True
    chofer_ids: Optional[List[str]] = None
