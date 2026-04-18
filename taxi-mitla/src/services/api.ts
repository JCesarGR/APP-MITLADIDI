const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export async function loginChofer(telefono: string, password: string) {
  return request<{ access_token: string; chofer_id: string; nombre: string }>(
    `/auth/chofer/login?telefono=${telefono}&password=${password}`,
    { method: 'POST' }
  );
}

export async function registerChofer(data: {
  nombre: string;
  telefono: string;
  password: string;
  unidad: string;
  foto_url?: string;
}) {
  return request('/auth/chofer/register', { method: 'POST', body: data });
}

export async function getChofer(choferId: string) {
  return request<any>(`/auth/chofer/${choferId}`);
}

// Choferes
export async function getChoferesDisponibles() {
  return request<any[]>('/choferes/disponibles');
}

export async function activarChofer(choferId: string, lat?: number, lng?: number) {
  return request(`/choferes/${choferId}/activar`, {
    method: 'POST',
    body: { lat, lng },
  });
}

export async function desactivarChofer(choferId: string) {
  return request(`/choferes/${choferId}/desactivar`, { method: 'POST' });
}

export async function actualizarUbicacion(choferId: string, lat: number, lng: number) {
  return request('/choferes/ubicacion', {
    method: 'POST',
    body: { chofer_id: choferId, lat, lng },
  });
}

export async function getGananciasChofer(choferId: string, dias: number = 7) {
  return request<{ fecha: string; viajes: number; ganancia: number }[]>(
    `/choferes/${choferId}/ganancias?dias=${dias}`
  );
}

// Viajes
export async function crearViaje(data: {
  pasajero_nombre: string;
  pasajero_telefono: string;
  origen: { lat: number; lng: number; descripcion?: string };
  destino_zona: string;
  destino: { lat: number; lng: number; descripcion?: string };
}) {
  return request<any>('/viajes/', { method: 'POST', body: data });
}

export async function getViaje(viajeId: string) {
  return request<any>(`/viajes/${viajeId}`);
}

export async function actualizarEstadoViaje(viajeId: string, estado: string) {
  return request(`/viajes/${viajeId}/estado`, {
    method: 'PUT',
    body: { estado },
  });
}

export async function getTrackingViaje(viajeId: string) {
  return request<any>(`/viajes/${viajeId}/tracking`);
}

// Tarifas
export async function getTarifas() {
  return request<any>('/tarifas/');
}

export async function calcularTarifa(zona: string, distanciaKm: number = 5) {
  return request<any>(`/tarifas/calcular?zona=${zona}&distancia_km=${distanciaKm}`);
}

// Health
export async function healthCheck() {
  return request<{ status: string }>('/health');
}

export { API_BASE_URL };
