from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class ZonaEnum(str, Enum):
    CENTRO = "centro"
    RUINAS = "ruinas"
    PERIFERIA = "periferia"
    FORANEO = "foraneo"


class EstadoViajeEnum(str, Enum):
    SOLICITADO = "solicitado"
    ACEPTADO = "aceptado"
    EN_CAMINO = "en_camino"
    RECOGIDO = "recogido"
    FINALIZADO = "finalizado"
    CANCELADO = "cancelado"


class BadgeEnum(str, Enum):
    PRINCIPIANTE = "principiante"
    REGULAR = "regular"
    EXPERTO = "experto"
    ELITE = "elite"


class Direccion(BaseModel):
    lat: float
    lng: float
    descripcion: Optional[str] = None


class ChoferBase(BaseModel):
    nombre: str
    telefono: str
    foto_url: Optional[str] = None
    unidad: str  # Placa o número de unidad


class ChoferCreate(ChoferBase):
    password: str


class ChoferResponse(ChoferBase):
    id: str
    badge: BadgeEnum
    viajes_completados: int = 0
    ganancia_total: float = 0.0
    activo: bool = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    ultima_actualizacion: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PasajeroBase(BaseModel):
    nombre: str
    telefono: str


class ViajeCreate(BaseModel):
    pasajero_nombre: str
    pasajero_telefono: str
    origen: Direccion
    destino_zona: ZonaEnum
    destino: Direccion


class ViajeResponse(BaseModel):
    id: str
    pasajero_nombre: str
    pasajero_telefono: str
    origen: Direccion
    destino_zona: ZonaEnum
    destino: Direccion
    chofer_id: Optional[str] = None
    chofer: Optional[ChoferResponse] = None
    estado: EstadoViajeEnum = EstadoViajeEnum.SOLICITADO
    distancia_km: float
    tarifa_base: float
    recargo_nocturno: float = 0.0
    recargo_plaza: float = 0.0
    tarifa_total: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ViajeUpdate(BaseModel):
    estado: EstadoViajeEnum


class TarifaConfig(BaseModel):
    zona: ZonaEnum
    precio_base: float
    precio_km_adicional: float


class TarifaResponse(BaseModel):
    tarifas: List[TarifaConfig]
    recargo_nocturno_porcentaje: float = 0.20  # 20%
    recargo_plaza_porcentaje: float = 0.50  # 50%
    hora_nocturna_inicio: int = 22
    hora_nocturna_fin: int = 6
    dias_plaza: List[int] = [0, 3]  # Lunes=0, Jueves=3


class UbicacionUpdate(BaseModel):
    chofer_id: str
    lat: float
    lng: float


class GananciasResponse(BaseModel):
    chofer_id: str
    fecha: str
    viajes: int
    ganancia: float
