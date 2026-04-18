export type ZonaEnum = 'centro' | 'ruinas' | 'periferia' | 'foraneo';

export type EstadoViajeEnum =
  | 'solicitado'
  | 'aceptado'
  | 'en_camino'
  | 'recogido'
  | 'finalizado'
  | 'cancelado';

export type BadgeEnum = 'principiante' | 'regular' | 'experto' | 'elite';

export interface Direccion {
  lat: number;
  lng: number;
  descripcion?: string;
}

export interface Chofer {
  id: string;
  nombre: string;
  telefono: string;
  foto_url?: string;
  unidad: string;
  badge: BadgeEnum;
  viajes_completados: number;
  ganancia_total: number;
  activo: boolean;
  lat?: number;
  lng?: number;
}

export interface Viaje {
  id: string;
  pasajero_nombre: string;
  pasajero_telefono: string;
  origen: Direccion;
  destino_zona: ZonaEnum;
  destino: Direccion;
  chofer_id?: string;
  chofer?: Chofer;
  estado: EstadoViajeEnum;
  distancia_km: number;
  tarifa_base: number;
  recargo_nocturno: number;
  recargo_plaza: number;
  tarifa_total: number;
  created_at: string;
  updated_at: string;
}

export interface TarifaConfig {
  zona: ZonaEnum;
  precio_base: number;
  precio_km_adicional: number;
}

export interface TarifaResponse {
  tarifas: TarifaConfig[];
  recargo_nocturno_porcentaje: number;
  recargo_plaza_porcentaje: number;
  hora_nocturna_inicio: number;
  hora_nocturna_fin: number;
  dias_plaza: number[];
}

export interface Ganancia {
  fecha: string;
  viajes: number;
  ganancia: number;
}

export interface TarifaInfo {
  tarifa_base: number;
  costo_km: number;
  recargo_nocturno: number;
  recargo_plaza: number;
  tarifa_total: number;
  es_nocturno: boolean;
  es_dia_plaza: boolean;
  zona: string;
  distancia_km: number;
}

export const ZONAS: { value: ZonaEnum; label: string; descripcion: string }[] = [
  { value: 'centro', label: 'Centro', descripcion: 'Zona céntrica de Mitla' },
  { value: 'ruinas', label: 'Ruinas', descripcion: 'Zona arqueológica' },
  { value: 'periferia', label: 'Periferia', descripcion: 'Alrededores de Mitla' },
  { value: 'foraneo', label: 'Foráneo', descripcion: 'Fuera de Mitla' },
];

export const BADGES_INFO: Record<BadgeEnum, { nombre: string; color: string; icono: string; min: number }> = {
  principe: { nombre: 'Principiante', color: '#9CA3AF', icono: '🌱', min: 0 },
  regular: { nombre: 'Regular', color: '#3B82F6', icono: '⭐', min: 20 },
  experto: { nombre: 'Experto', color: '#F59E0B', icono: '🔥', min: 50 },
  elite: { nombre: 'ÉLITE', color: '#EF4444', icono: '👑', min: 100 },
};

export const ESTADO_VIAJE_INFO: Record<EstadoViajeEnum, { label: string; color: string }> = {
  solicitado: { label: 'Buscando chofer...', color: '#F59E0B' },
  aceptado: { label: 'Chofer asignado', color: '#3B82F6' },
  en_camino: { label: 'En camino', color: '#3B82F6' },
  recogido: { label: 'En curso', color: '#10B981' },
  finalizado: { label: 'Finalizado', color: '#10B981' },
  cancelado: { label: 'Cancelado', color: '#EF4444' },
};
