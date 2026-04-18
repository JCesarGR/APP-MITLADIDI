import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrackingViaje, getViaje } from '../services/api';
import { wsService } from '../services/websocket';
import { useApp } from '../context/AppContext';
import { Viaje, ESTADO_VIAJE_INFO, ZONAS } from '../types';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import MapTracking from '../components/MapTracking';
import { useArrivalDetection } from '../hooks/useGeofence';

export default function TrackingPage() {
  const { viajeId } = useParams<{ viajeId: string }>();
  const navigate = useNavigate();
  const { setViajeActivo } = useApp();

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [choferLocation, setChoferLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoArrivalNotified, setAutoArrivalNotified] = useState(false);

  // Geofence para detectar llegada automática (50m radio)
  const destinoLat = viaje?.destino?.lat || 16.9548;
  const destinoLng = viaje?.destino?.lng || -96.5122;

  const { hasArrived, approachPercentage, distance: distanciaDestino } = useArrivalDetection(
    destinoLat,
    destinoLng,
    async () => {
      if (!autoArrivalNotified && viaje && viaje.estado === 'en_camino') {
        setAutoArrivalNotified(true);
        // Vibración especial para llegada
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await LocalNotifications.schedule({
          notifications: [{
            title: '🚕 ¡El taxi llegó!',
            body: 'El conductor está a menos de 50 metros. ¡Sal a la calle!',
            id: Date.now(),
            sound: 'default',
          }],
        });
      }
    },
    50 // Radio de 50 metros
  );

  // Resetear notificación de llegada si cambia el estado
  useEffect(() => {
    if (viaje?.estado === 'solicitado' || viaje?.estado === 'aceptado') {
      setAutoArrivalNotified(false);
    }
  }, [viaje?.estado]);

  useEffect(() => {
    cargarViaje();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      // Desconectar WebSocket al salir
      wsService.off('location_update', handleLocationUpdate);
      wsService.off('estado_actualizado', handleEstadoUpdate);
    };
  }, [viajeId]);

  const handleLocationUpdate = useCallback((data: any) => {
    if (data.viaje_id === viajeId && data.lat && data.lng) {
      setChoferLocation({ lat: data.lat, lng: data.lng });
      setLastUpdate(new Date());
    }
  }, [viajeId]);

  const handleEstadoUpdate = useCallback(async (data: any) => {
    if (data.viaje_id === viajeId) {
      setViaje((prev) => prev ? { ...prev, estado: data.estado } : null);
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await LocalNotifications.schedule({
        notifications: [{
          title: 'TaxiMitla',
          body: `Estado actualizado: ${ESTADO_VIAJE_INFO[data.estado as keyof typeof ESTADO_VIAJE_INFO]?.label}`,
          id: Date.now(),
        }],
      });
      if (data.estado === 'finalizado') {
        navigate('/');
        setViajeActivo(null);
        localStorage.removeItem('viajeDemo');
      }
    }
  }, [viajeId, navigate, setViajeActivo]);

  useEffect(() => {
    // Configurar listeners de WebSocket
    wsService.on('location_update', handleLocationUpdate);
    wsService.on('estado_actualizado', handleEstadoUpdate);
  }, [handleLocationUpdate, handleEstadoUpdate]);

  const cargarViaje = async () => {
    if (!viajeId) return;

    const viajeDemo = localStorage.getItem('viajeDemo');
    if (viajeDemo) {
      const demo = JSON.parse(viajeDemo);
      if (demo.id === viajeId) {
        setViaje(demo);
        // Conectar WebSocket para tracking
        if (wsService) {
          wsService.connectTracking(viajeId);
          setWsConnected(true);
        }
        // Simular ubicación del chofer para demo
        if (demo.chofer) {
          let lat = demo.origen.lat || 16.9548;
          let lng = demo.origen.lng || -96.5122;
          // Simular movimiento del chofer
          const simulateMovement = () => {
            lat += (demo.destino.lat - (demo.origen.lat || 16.9548)) * 0.02;
            lng += (demo.destino.lng - (demo.origen.lng || -96.5122)) * 0.02;
            setChoferLocation({ lat, lng });
          };
          setTimeout(simulateMovement, 2000);
          const interval = setInterval(simulateMovement, 3000);
          return () => clearInterval(interval);
        }
        setLoading(false);
        return;
      }
    }

    try {
      const data = await getViaje(viajeId);
      setViaje(data);
      // Conectar WebSocket
      wsService.connectTracking(viajeId);
      setWsConnected(true);
    } catch (error) {
      console.error('Error al cargar viaje:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!viajeId) return;

    // Polling como backup (cada 5 segundos)
    const interval = setInterval(async () => {
      try {
        const data = await getTrackingViaje(viajeId);
        if (viaje && data.estado !== viaje.estado) {
          await Haptics.impact({ style: ImpactStyle.Heavy });
          setViaje((prev) => prev ? { ...prev, estado: data.estado } : null);
        }
        if (data.chofer?.lat && data.chofer?.lng) {
          setChoferLocation({ lat: data.chofer.lat, lng: data.chofer.lng });
          setLastUpdate(new Date());
        }
        if (data.estado === 'finalizado') {
          navigate('/');
          setViajeActivo(null);
          localStorage.removeItem('viajeDemo');
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 5000);

    setPollingInterval(interval);
    return () => clearInterval(interval);
  }, [viajeId, viaje?.estado, navigate, setViajeActivo]);

  const handleFinalizarViaje = async () => {
    if (confirm('¿Confirmas que el viaje ha finalizado?')) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      wsService.disconnect();
      navigate('/');
      setViajeActivo(null);
      localStorage.removeItem('viajeDemo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Cargando tracking...</p>
        </div>
      </div>
    );
  }

  if (!viaje) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Viaje no encontrado</p>
          <button onClick={() => navigate('/')} className="bg-white/20 px-6 py-3 rounded-lg">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const estadoInfo = ESTADO_VIAJE_INFO[viaje.estado as keyof typeof ESTADO_VIAJE_INFO] || { label: viaje.estado, color: '#666' };
  const zonaLabel = viaje.destino?.descripcion || ZONAS.find((z) => z.value === viaje.destino_zona)?.label || viaje.destino_zona;
  const destinoNombre = typeof zonaLabel === 'string' ? zonaLabel : 'Destino';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 safe-area-inset-top">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">📍 Tracking en Vivo</h1>
            <p className="text-primary-200 text-sm flex items-center">
              {wsConnected && <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>}
              TaxiMitla
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-white text-sm font-medium" style={{ backgroundColor: estadoInfo.color }}>
            {estadoInfo.label}
          </div>
        </div>
      </div>

      {/* Mapa con Tracking Real */}
      <div className="h-80 relative">
        <MapTracking
          choferLat={choferLocation?.lat}
          choferLng={choferLocation?.lng}
          pasajeroLat={viaje.origen?.lat || 16.9548}
          pasajeroLng={viaje.origen?.lng || -96.5122}
          destinoLat={viaje.destino?.lat || 16.9548}
          destinoLng={viaje.destino?.lng || -96.5122}
          choferNombre={viaje.chofer?.nombre}
          destinoNombre={destinoNombre}
        />
      </div>

      <div className="bg-white rounded-t-3xl px-4 py-6 -mt-4">
        {viaje.chofer ? (
          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-3xl">👤</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-800">{viaje.chofer.nombre}</p>
                <p className="text-sm text-gray-500">Unidad: {viaje.chofer.unidad}</p>
                <p className="text-sm text-gray-500">{viaje.chofer.telefono}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: viaje.chofer.badge === 'elite' ? '#EF4444' : viaje.chofer.badge === 'experto' ? '#F59E0B' : '#3B82F6', color: 'white' }}>
                  {viaje.chofer.badge === 'elite' && '👑 '}{viaje.chofer.badge?.toUpperCase()}
                </span>
                <p className="text-xs text-gray-500 mt-1">{viaje.chofer.viajes_completados} viajes</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-center">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl animate-pulse">🚕</span>
            </div>
            <p className="font-semibold text-amber-800">Buscando chofer cercano...</p>
            <p className="text-sm text-amber-600">Te asignaremos el taxi más cercano</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-500">Destino</p>
              <p className="font-semibold">{destinoNombre}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Total</p>
              <p className="font-bold text-primary-600">${viaje.tarifa_total?.toFixed(2) || '25.00'}</p>
            </div>
          </div>

          {/* Barra de aproximación con geofencing */}
          {approachPercentage !== null && viaje?.estado === 'en_camino' && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700 font-medium">
                  {hasArrived ? '🎉 ¡El taxi llegó!' : '📍 Aproximándose...'}
                </span>
                <span className="text-sm text-green-600">
                  {distanciaDestino !== null
                    ? distanciaDestino < 50
                      ? 'A menos de 50m'
                      : `${Math.round(distanciaDestino)}m`
                    : 'Calculando...'}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    hasArrived
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gradient-to-r from-green-400 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, approachPercentage))}%` }}
                />
              </div>
              {hasArrived && (
                <p className="text-xs text-green-600 mt-2 text-center font-medium">
                  🚨 ¡El taxi está cerca! Sal a la calle
                </p>
              )}
            </div>
          )}

          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-2 flex items-center justify-end">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Actualizado hace {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s
            </p>
          )}
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Estados del Viaje</h4>
          <div className="flex justify-between items-center">
            {['solicitado', 'aceptado', 'en_camino', 'recogido', 'finalizado'].map((estado, index) => {
              const info = ESTADO_VIAJE_INFO[estado as keyof typeof ESTADO_VIAJE_INFO];
              const estados = ['solicitado', 'aceptado', 'en_camino', 'recogido', 'finalizado'];
              const currentIndex = estados.indexOf(viaje.estado);
              const isActive = estados.indexOf(estado) <= currentIndex;
              return (
                <div key={estado} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {index + 1}
                  </div>
                  <p className={`text-xs mt-1 ${isActive ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                    {info.label.split(' ')[0]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {viaje.estado !== 'finalizado' && (
          <button onClick={handleFinalizarViaje} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg mb-4">
            ✅ Finalizar Viaje (Demo)
          </button>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>🚗 Tiempo estimado de llegada: 5-10 minutos</p>
          <p className="mt-1">
            {wsConnected ? '📡 Tracking en tiempo real' : '⏳ Conectando...'}
          </p>
        </div>
      </div>
    </div>
  );
}
