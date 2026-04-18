from datetime import datetime
from typing import Dict, List
from app.schemas.schemas import TarifaResponse, TarifaConfig, ZonaEnum, BadgeEnum


# Configuración de tarifas por zona
TARIFAS_BASE: Dict[ZonaEnum, float] = {
    ZonaEnum.CENTRO: 25.0,
    ZonaEnum.RUINAS: 35.0,
    ZonaEnum.PERIFERIA: 45.0,
    ZonaEnum.FORANEO: 60.0,
}

PRECIO_KM_ADICIONAL = 8.0  # MXN por km adicional
RECARGO_NOCTURNO_PORCENTAJE = 0.20  # 20%
RECARGO_PLAZA_PORCENTAJE = 0.50  # 50%
HORA_NOCTURNA_INICIO = 22
HORA_NOCTURNA_FIN = 6
DIAS_PLAZA = [0, 3]  # Lunes=0, Jueves=3


class TarifaService:
    @staticmethod
    def calcular_tarifa(
        zona: ZonaEnum,
        distancia_km: float,
        es_nocturno: bool = False,
        es_dia_plaza: bool = False
    ) -> dict:
        """Calcula la tarifa total considerando recargos."""
        tarifa_base = TARIFAS_BASE[zona]

        # Agregar costo por km adicional (después de 3km base)
        km_adicionales = max(0, distancia_km - 3)
        costo_km = km_adicionales * PRECIO_KM_ADICIONAL

        subtotal = tarifa_base + costo_km
        recargo_nocturno = 0.0
        recargo_plaza = 0.0

        if es_nocturno:
            recargo_nocturno = subtotal * RECARGO_NOCTURNO_PORCENTAJE

        if es_dia_plaza:
            recargo_plaza = subtotal * RECARGO_PLAZA_PORCENTAJE

        total = subtotal + recargo_nocturno + recargo_plaza

        return {
            "tarifa_base": round(tarifa_base, 2),
            "costo_km": round(costo_km, 2),
            "recargo_nocturno": round(recargo_nocturno, 2),
            "recargo_plaza": round(recargo_plaza, 2),
            "tarifa_total": round(total, 2),
        }

    @staticmethod
    def es_hora_nocturna() -> bool:
        """Verifica si es hora nocturna (22:00 - 06:00)."""
        now = datetime.now().hour
        return now >= HORA_NOCTURNA_INICIO or now < HORA_NOCTURNA_FIN

    @staticmethod
    def es_dia_plaza() -> bool:
        """Verifica si es día de plaza (lunes o jueves)."""
        return datetime.now().weekday() in DIAS_PLAZA

    @staticmethod
    def obtener_tarifas() -> TarifaResponse:
        """Obtiene la configuración completa de tarifas."""
        tarifas = [
            TarifaConfig(zona=zona, precio_base=precio, precio_km_adicional=PRECIO_KM_ADICIONAL)
            for zona, precio in TARIFAS_BASE.items()
        ]
        return TarifaResponse(
            tarifas=tarifas,
            recargo_nocturno_porcentaje=RECARGO_NOCTURNO_PORCENTAJE,
            recargo_plaza_porcentaje=RECARGO_PLAZA_PORCENTAJE,
            hora_nocturna_inicio=HORA_NOCTURNA_INICIO,
            hora_nocturna_fin=HORA_NOCTURNA_FIN,
            dias_plaza=DIAS_PLAZA
        )


class AsignacionService:
    @staticmethod
    def calcular_distancia(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calcula distancia en km usando fórmula de Haversine."""
        import math
        R = 6371  # Radio de la Tierra en km

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)

        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        return R * c

    @staticmethod
    def asignar_chofer_mas_cercano(
        choferes_disponibles: List[dict],
        lat_origen: float,
        lng_origen: float
    ) -> dict:
        """Asigna el chofer más cercano a la ubicación del pasajero."""
        if not choferes_disponibles:
            return None

        choferes_con_distancia = []
        for chofer in choferes_disponibles:
            if chofer.get("lat") and chofer.get("lng"):
                distancia = AsignacionService.calcular_distancia(
                    lat_origen, lng_origen,
                    chofer["lat"], chofer["lng"]
                )
                choferes_con_distancia.append((chofer, distancia))

        if not choferes_con_distancia:
            return None

        # Ordenar por distancia y retornar el más cercano
        choferes_con_distancia.sort(key=lambda x: x[1])
        return choferes_con_distancia[0][0]


class BadgeService:
    @staticmethod
    def calcular_badge(viajes_completados: int) -> BadgeEnum:
        """Calcula el badge según el número de viajes completados."""
        if viajes_completados >= 100:
            return BadgeEnum.ELITE
        elif viajes_completados >= 50:
            return BadgeEnum.EXPERTO
        elif viajes_completados >= 20:
            return BadgeEnum.REGULAR
        else:
            return BadgeEnum.PRINCIPIANTE

    @staticmethod
    def get_badge_info(badge: BadgeEnum) -> dict:
        """Obtiene información del badge."""
        badges_info = {
            BadgeEnum.PRINCIPIANTE: {"nombre": "Principiante", "color": "#9CA3AF", "icono": "🌱", "min_viajes": 0},
            BadgeEnum.REGULAR: {"nombre": "Regular", "color": "#3B82F6", "icono": "⭐", "min_viajes": 20},
            BadgeEnum.EXPERTO: {"nombre": "Experto", "color": "#F59E0B", "icono": "🔥", "min_viajes": 50},
            BadgeEnum.ELITE: {"nombre": "ÉLITE", "color": "#EF4444", "icono": "👑", "min_viajes": 100},
        }
        return badges_info.get(badge, badges_info[BadgeEnum.PRINCIPIANTE])
