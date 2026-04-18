from fastapi import APIRouter
from app.schemas.schemas import TarifaResponse, TarifaService

router = APIRouter(prefix="/tarifas", tags=["tarifas"])

@router.get("/", response_model=TarifaResponse)
async def get_tarifas():
    """Obtener configuración de tarifas."""
    return TarifaService.obtener_tarifas()

@router.get("/calcular")
async def calcular_tarifa(zona: str, distancia_km: float = 5.0):
    """Calcular tarifa para una zona específica."""
    from app.schemas.schemas import ZonaEnum
    try:
        zona_enum = ZonaEnum(zona.lower())
    except ValueError:
        return {"error": "Zona no válida. Opciones: centro, ruinas, periferia, foraneo"}

    es_nocturno = TarifaService.es_hora_nocturna()
    es_dia_plaza = TarifaService.es_dia_plaza()

    resultado = TarifaService.calcular_tarifa(zona_enum, distancia_km, es_nocturno, es_dia_plaza)
    resultado["es_nocturno"] = es_nocturno
    resultado["es_dia_plaza"] = es_dia_plaza
    resultado["zona"] = zona
    resultado["distancia_km"] = distancia_km

    return resultado
