import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  activarChofer,
  desactivarChofer,
  actualizarUbicacion,
  getGananciasChofer,
  getChofer,
  getViaje,
  actualizarEstadoViaje,
} from '../services/api';
import { wsService } from '../services/websocket';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Ganancia, BadgeEnum } from '../types';

interface ViajePendiente {
  id: string;
  pasajero_nombre: string;
  origen: { lat: number; lng: number; descripcion?: string };
  destino_zona: string;
  tarifa: number;
}

const BADGES_INFO: Record<BadgeEnum, { nombre: string; color: string; icono: string; min: number }> = {
  principe: { nombre: 'Principiante', color: '#9CA3AF', icono: '🌱', min: 0 },
  regular: { nombre: 'Regular', color: '#3B82F6', icono: '⭐', min: 20 },
  experto: { nombre: 'Experto', color: '#F59E0B', icono: '🔥', min: 50 },
  elite: { nombre: 'ÉLITE', color: '#EF4444', icono: '👑', min: 100 },
};

export default function ChoferPage() {
  const navigate = useNavigate();
  const { choferId, choferNombre, logout, setViajeActivo } = useApp();
  const { latitude, longitude, loading: geoLoading } = useGeolocation();

  const [conectado, setConectado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ganancias, setGanancias] = useState<Ganancia[]>([]);
  const [badge, setBadge] = useState<BadgeEnum>('principiante');
  const [viajesCompletados, setViajesCompletados] = useState(0);
  const [viajeActivo, setViajeActivoLocal] = useState<any>(null);
  const [viajesPendientes, setViajesPendientes] = useState<ViajePendiente[]>([]);
  const [ubicacionInterval, setUbicacionInterval] = useState<number | null>(null);

  useEffect(() => {
    if (choferId) {
      cargarDatosChofer();
      cargarGanancias();
    }

    return () => {
      if (ubicacionInterval) {
        clearInterval(ubicacionInterval);
      }
      wsService.disconnect();
    };
  }, [choferId]);

  useEffect(() => {
    // Iniciar actualización de ubicación si está conectado
    if (conectado && latitude && longitude) {
      iniciarEnvioUbicacion();
    }

    return () => {
      if (ubicacionInterval) {
        clearInterval(ubicacionInterval);
      }
    };
  }, [conectado, latitude, longitude]);

  const cargarDatosChofer = async () => {
    if (!choferId) return;
    try {
      const chofer = await getChofer(choferId);
      setBadge(chofer.badge || 'principiante');
      setViajesCompletados(chofer.viajes_completados || 0);
    } catch (error) {
      console.error('Error al cargar datos del chofer:', error);
    }
  };

  const cargarGanancias = async () => {
    if (!choferId) return;
    try {
      const data = await getGananciasChofer(choferId, 7);
      setGanancias(data);
    } catch (error) {
      console.error('Error al cargar ganancias:', error);
      // Datos demo
      setGanancias([
        { fecha: '2024-01-15', viajes: 8, ganancia: 450 },
        { fecha: '2024-01-14', viajes: 12, ganancia: 680 },
        { fecha: '2024-01-13', viajes: 6, ganancia: 320 },
      ]);
    }
  };

  const iniciarEnvioUbicacion = () => {
    if (ubicacionInterval) {
      clearInterval(ubicacionInterval);
    }

    const interval = setInterval(async () => {
      if (latitude && longitude && choferId) {
        try {
          await actualizarUbicacion(choferId, latitude, longitude);
          wsService.sendLocation(latitude, longitude);
        } catch (error) {
          console.error('Error al enviar ubicación:', error);
        }
      }
    }, 10000); // Cada 10 segundos

    setUbicacionInterval(interval);
  };

  const handleConectar = async () => {
    setLoading(true);
    await Haptics.impact({ style: ImpactStyle.Medium });

    try {
      if (choferId) {
        await activarChofer(choferId, latitude || undefined, longitude || undefined);
        wsService.connectChofer(choferId);
        setConectado(true);

        // Configurar listeners de WebSocket
        wsService.on('nuevo_viaje', handleNuevoViaje);
        wsService.on('viaje_cancelado', handleViajeCancelado);

        await Haptics.notification({ type: NotificationType.Success });
      }
    } catch (error) {
      console.error('Error al conectar:', error);
      // Conectar en modo demo
      setConectado(true);
      wsService.on('nuevo_viaje', handleNuevoViaje);
    } finally {
      setLoading(false);
    }
  };

  const handleDesconectar = async () => {
    setLoading(true);
    await Haptics.impact({ style: ImpactStyle.Light });

    try {
      if (choferId) {
        await desactivarChofer(choferId);
      }
      wsService.disconnect();
      setConectado(false);
      setViajesPendientes([]);
    } catch (error) {
      console.error('Error al desconectar:', error);
      setConectado(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoViaje = async (data: any) => {
    await Haptics.notification({ type: NotificationType.Warning });
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🚕 Nuevo Viaje!',
          body: `${data.pasajero_nombre} necesita un taxi`,
          id: Date.now(),
        },
      ],
    });

    setViajesPendientes((prev) => [
      ...prev,
      {
        id: data.viaje_id,
        pasajero_nombre: data.pasajero_nombre,
        origen: data.origen,
        destino_zona: data.destino_zona,
        tarifa: data.tarifa,
      },
    ]);
  };

  const handleViajeCancelado = (data: any) => {
    setViajesPendientes((prev) => prev.filter((v) => v.id !== data.viaje_id));
  };

  const handleAceptarViaje = async (viaje: ViajePendiente) => {
    await Haptics.impact({ style: ImpactStyle.Heavy });

    try {
      await actualizarEstadoViaje(viaje.id, 'aceptado');
      setViajeActivoLocal(viaje);
      setViajeActivo(viaje.id);
      setViajesPendientes((prev) => prev.filter((v) => v.id !== viaje.id));
      localStorage.setItem('viajeDemo', JSON.stringify({
        id: viaje.id,
        pasajero_nombre: viaje.pasajero_nombre,
        origen: viaje.origen,
        destino_zona: viaje.destino_zona,
        destino: { lat: 16.9, lng: -96.5 },
        estado: 'aceptado',
        tarifa_total: viaje.tarifa,
        chofer: { id: choferId, nombre: choferNombre },
      }));
    } catch (error) {
      console.error('Error al aceptar viaje:', error);
      // Demo
      setViajeActivoLocal(viaje);
      setViajeActivo(viaje.id);
      setViajesPendientes((prev) => prev.filter((v) => v.id !== viaje.id));
    }
  };

  const handleRechazarViaje = (viajeId: string) => {
    setViajesPendientes((prev) => prev.filter((v) => v.id !== viajeId));
  };

  const handleActualizarEstado = async (nuevoEstado: string) => {
    if (!viajeActivo) return;

    await Haptics.impact({ style: ImpactStyle.Medium });

    try {
      await actualizarEstadoViaje(viajeActivo.id, nuevoEstado);
      setViajeActivoLocal({ ...viajeActivo, estado: nuevoEstado });

      if (nuevoEstado === 'finalizado') {
        await Haptics.notification({ type: NotificationType.Success });
        setViajeActivoLocal(null);
        setViajeActivo(null);
        localStorage.removeItem('viajeDemo');
        cargarGanancias();
        cargarDatosChofer();
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      // Demo
      if (nuevoEstado === 'finalizado') {
        setViajeActivoLocal(null);
        setViajeActivo(null);
        localStorage.removeItem('viajeDemo');
      }
    }
  };

  const handleLogout = async () => {
    if (conectado) {
      await handleDesconectar();
    }
    logout();
    navigate('/chofer/login');
  };

  const badgeInfo = BADGES_INFO[badge as BadgeEnum] || BADGES_INFO.principio;
  const gananciaTotal = ganancias.reduce((sum, g) => sum + g.ganancia, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 safe-area-inset-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">👨‍✈️ Panel del Chofer</h1>
            <p className="text-primary-200 text-sm">{choferNombre}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-t-3xl min-h-screen px-4 py-6">
        {/* Perfil */}
        <div className="bg-primary-50 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-4xl">👤</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-800">{choferNombre}</p>
              <p className="text-sm text-gray-500">Chofer TaxiMitla</p>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-bold mt-1"
                style={{ backgroundColor: badgeInfo.color, color: 'white' }}
              >
                {badgeInfo.icono} {badgeInfo.nombre}
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-600">{viajesCompletados}</p>
              <p className="text-xs text-gray-500">viajes</p>
            </div>
          </div>
        </div>

        {/* Estado de Conexión */}
        <div className="mb-6">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></div>
              <div>
                <p className="font-semibold text-gray-800">
                  {conectado ? '🟢 Conectado' : '⚪ Desconectado'}
                </p>
                <p className="text-sm text-gray-500">
                  {conectado
                    ? 'Recibiendo viajes'
                    : 'Presiona para comenzar a recibir'}
                </p>
              </div>
            </div>
            <button
              onClick={conectado ? handleDesconectar : handleConectar}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-bold ${
                conectado
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white'
              } disabled:opacity-50`}
            >
              {loading ? '...' : conectado ? 'Desconectar' : 'Conectar'}
            </button>
          </div>

          {/* Ubicación */}
          {conectado && (
            <div className="mt-3 bg-green-50 rounded-xl p-3 text-sm">
              <p className="text-green-700">
                📍 Enviando ubicación cada 10 segundos
              </p>
              {latitude && longitude && (
                <p className="text-green-600 text-xs mt-1">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Viajes Pendientes */}
        {viajesPendientes.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">🔔 Viajes Pendientes ({viajesPendientes.length})</h3>
            <div className="space-y-3">
              {viajesPendientes.map((viaje) => (
                <div key={viaje.id} className="bg-amber-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{viaje.pasajero_nombre}</p>
                      <p className="text-sm text-gray-500">Destino: {viaje.destino_zona}</p>
                    </div>
                    <p className="text-xl font-bold text-amber-600">${viaje.tarifa}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAceptarViaje(viaje)}
                      className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold"
                    >
                      ✅ Aceptar
                    </button>
                    <button
                      onClick={() => handleRechazarViaje(viaje.id)}
                      className="px-4 bg-gray-200 text-gray-600 py-2 rounded-lg font-medium"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viaje Activo */}
        {viajeActivo && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">🚗 Viaje en Curso</h3>
            <div className="bg-primary-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-lg">{viajeActivo.pasajero_nombre}</p>
                <p className="text-xl font-bold text-primary-600">${viajeActivo.tarifa}</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <span className="mr-2">📍</span>
                  <span>Origen: {viajeActivo.origen.descripcion || 'Ubicación del pasajero'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="mr-2">🎯</span>
                  <span>Destino: {viajeActivo.destino_zona}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleActualizarEstado('aceptado')}
                  className="bg-blue-500 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Asignado
                </button>
                <button
                  onClick={() => handleActualizarEstado('en_camino')}
                  className="bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Camino
                </button>
                <button
                  onClick={() => handleActualizarEstado('recogido')}
                  className="bg-green-500 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Recogido
                </button>
                <button
                  onClick={() => handleActualizarEstado('finalizado')}
                  className="bg-green-600 text-white py-2 rounded-lg text-sm font-bold"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ganancias */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">💵 Ganancias (7 días)</h3>
            <p className="text-xl font-bold text-green-600">${gananciaTotal.toFixed(0)}</p>
          </div>

          {ganancias.length > 0 ? (
            <div className="bg-gray-50 rounded-xl p-3">
              {ganancias.slice(0, 5).map((g) => (
                <div key={g.fecha} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800">{g.fecha}</p>
                    <p className="text-xs text-gray-500">{g.viajes} viajes</p>
                  </div>
                  <p className="font-semibold text-green-600">${g.ganancia.toFixed(0)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
              <p>Sin ganancias esta semana</p>
              <p className="text-sm mt-1">Conéctate para comenzar a recibir viajes</p>
            </div>
          )}
        </div>

        {/* Accesos Rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-100 text-gray-700 py-4 rounded-xl font-medium"
          >
            🚕 Modo Pasajero
          </button>
          <button
            onClick={cargarGanancias}
            className="bg-gray-100 text-gray-700 py-4 rounded-xl font-medium"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
