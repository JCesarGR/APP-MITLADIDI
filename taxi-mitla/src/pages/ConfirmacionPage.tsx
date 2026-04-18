import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getViaje, getTrackingViaje } from '../services/api';
import { useApp } from '../context/AppContext';
import { Viaje, ESTADO_VIAJE_INFO, ZONAS } from '../types';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function ConfirmacionPage() {
  const { viajeId } = useParams<{ viajeId: string }>();
  const navigate = useNavigate();
  const { setViajeActivo } = useApp();

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  useEffect(() => {
    cargarViaje();
    iniciarPolling();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [viajeId]);

  const cargarViaje = async () => {
    if (!viajeId) return;

    // Verificar si es un viaje demo
    const viajeDemo = localStorage.getItem('viajeDemo');
    if (viajeDemo) {
      const demo = JSON.parse(viajeDemo);
      if (demo.id === viajeId) {
        setViaje(demo);
        setLoading(false);
        return;
      }
    }

    try {
      const data = await getViaje(viajeId);
      setViaje(data);
    } catch (error) {
      console.error('Error al cargar viaje:', error);
      // Mantener estado para demo
    } finally {
      setLoading(false);
    }
  };

  const iniciarPolling = () => {
    const interval = window.setInterval(async () => {
      if (!viajeId) return;

      try {
        const data = await getTrackingViaje(viajeId);

        // Si hay cambio de estado, notificar
        if (viaje && data.estado !== viaje.estado) {
          await Haptics.impact({ style: ImpactStyle.Heavy });
          await LocalNotifications.schedule({
            notifications: [
              {
                title: 'TaxiMitla',
                body: `Estado actualizado: ${ESTADO_VIAJE_INFO[data.estado as keyof typeof ESTADO_VIAJE_INFO]?.label}`,
                id: Date.now(),
              },
            ],
          });

          // Navegar si el chofer fue asignado
          if (data.estado === 'aceptado' || data.estado === 'en_camino') {
            navigate(`/tracking/${viajeId}`);
          }
        }

        // Actualizar datos del viaje
        if (data) {
          setViaje((prev) => prev ? { ...prev, ...data } : null);
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const handleCancelar = async () => {
    if (confirm('¿Estás seguro de cancelar el viaje?')) {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setViajeActivo(null);
      localStorage.removeItem('viajeDemo');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Buscando taxi cercano...</p>
        </div>
      </div>
    );
  }

  if (!viaje) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Viaje no encontrado</p>
          <button
            onClick={() => navigate('/')}
            className="bg-white/20 px-6 py-3 rounded-lg"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const estadoInfo = ESTADO_VIAJE_INFO[viaje.estado as keyof typeof ESTADO_VIAJE_INFO] || {
    label: viaje.estado,
    color: '#666'
  };
  const zonaLabel = ZONAS.find((z) => z.value === viaje.destino_zona)?.label || viaje.destino_zona;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 safe-area-inset-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Confirmación</h1>
        <p className="text-primary-200 text-sm">TaxiMitla</p>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-t-3xl min-h-screen px-4 py-6">
        {/* Estado con animación radar */}
        <div className="text-center mb-8">
          <div className="relative w-32 h-32 mx-auto mb-4">
            {/* Radar animado */}
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full opacity-20"></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full radar-pulse"></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full radar-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full radar-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">🚕</span>
            </div>
          </div>

          <div
            className="inline-block px-4 py-2 rounded-full text-white font-semibold"
            style={{ backgroundColor: estadoInfo.color }}
          >
            {estadoInfo.label}
          </div>
        </div>

        {/* Detalles del Viaje */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">📋 Detalles del Viaje</h3>

          <div className="space-y-3">
            <div className="flex items-start">
              <span className="text-xl mr-3">👤</span>
              <div>
                <p className="text-sm text-gray-500">Pasajero</p>
                <p className="font-medium text-gray-800">{viaje.pasajero_nombre}</p>
                <p className="text-sm text-gray-500">{viaje.pasajero_telefono}</p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-xl mr-3">📍</span>
              <div>
                <p className="text-sm text-gray-500">Origen</p>
                <p className="font-medium text-gray-800">Mi ubicación actual</p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-xl mr-3">🎯</span>
              <div>
                <p className="text-sm text-gray-500">Destino</p>
                <p className="font-medium text-gray-800">{zonaLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarifa */}
        <div className="bg-primary-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">💰 Tarifa Estimada</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="text-3xl font-bold text-primary-600">
                ${viaje.tarifa_total?.toFixed(2) || '25.00'} <span className="text-lg">MXN</span>
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Tarifa base: ${viaje.tarifa_base?.toFixed(2) || '25.00'}</p>
              {viaje.recargo_nocturno > 0 && (
                <p className="text-amber-600">+ Recargo nocturno</p>
              )}
              {viaje.recargo_plaza > 0 && (
                <p className="text-purple-600">+ Día de plaza</p>
              )}
            </div>
          </div>
        </div>

        {/* Info del Chofer (si ya asignado) */}
        {viaje.chofer && (
          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">👨‍✈️ Tu Chofer</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-3xl">👤</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{viaje.chofer.nombre}</p>
                <p className="text-sm text-gray-500">Unidad: {viaje.chofer.unidad}</p>
                <p className="text-sm">
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: viaje.chofer.badge === 'elite' ? '#EF4444' : '#3B82F6', color: 'white' }}
                  >
                    {viaje.chofer.badge === 'elite' && '👑 '}{viaje.chofer.badge?.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/tracking/${viajeId}`)}
            className="w-full bg-primary-500 text-white py-4 rounded-xl font-bold text-lg"
          >
            📍 Ver Tracking en Tiempo Real
          </button>

          <button
            onClick={handleCancelar}
            className="w-full bg-red-100 text-red-600 py-4 rounded-xl font-bold"
          >
            ❌ Cancelar Viaje
          </button>
        </div>

        {/* Tiempo estimado */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>⏱️ Tiempo estimado de llegada: 5-15 minutos</p>
          <p className="mt-1">El chofer más cercano recibirás tu solicitud</p>
        </div>
      </div>
    </div>
  );
}
