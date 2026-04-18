import { useEffect, useRef, useState, useCallback } from 'react';
import { MITLA_CENTER } from '../hooks/useAddressAutocomplete';

interface MapTrackingProps {
  choferLat?: number | null;
  choferLng?: number | null;
  pasajeroLat: number;
  pasajeroLng: number;
  destinoLat: number;
  destinoLng: number;
  choferNombre?: string;
  destinoNombre?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

// Iconos SVG para el mapa
const ICON_ORIGEN = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>`;
const ICON_CHOFER = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#F59E0B" stroke="white" stroke-width="1"><path d="M5 17h14v-5l-2-4H7l-2 4v5zm14-9l1-3H4l1 3h14zm-9-5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>`;
const ICON_DESTINO = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#10B981" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>`;

export default function MapTracking({
  choferLat,
  choferLng,
  pasajeroLat,
  pasajeroLng,
  destinoLat,
  destinoLng,
  choferNombre,
  destinoNombre,
  onMapClick,
}: MapTrackingProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{
    chofer?: google.maps.Marker;
    pasajero?: google.maps.Marker;
    destino?: google.maps.Marker;
  }>({});

  // Inicializar Google Maps
  useEffect(() => {
    if (typeof google === 'undefined' || !mapRef.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: MITLA_CENTER.lat, lng: MITLA_CENTER.lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          // Estilo oscuro para matching con la app
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ saturation: -30 }],
          },
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Listener para clicks en el mapa
      if (onMapClick) {
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar Google Maps:', error);
      setMapError(true);
    }
  }, [onMapClick]);

  // Actualizar marcadores cuando cambian las coordenadas
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const bounds = new google.maps.LatLngBounds();

    // Marcador del pasajero
    if (pasajeroLat && pasajeroLng) {
      if (markersRef.current.pasajero) {
        markersRef.current.pasajero.setPosition({ lat: pasajeroLat, lng: pasajeroLng });
      } else {
        markersRef.current.pasajero = new google.maps.Marker({
          position: { lat: pasajeroLat, lng: pasajeroLng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(ICON_ORIGEN),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
          title: 'Tu ubicación',
          zIndex: 1,
        });
      }
      bounds.extend({ lat: pasajeroLat, lng: pasajeroLng });
    }

    // Marcador del chofer
    if (choferLat && choferLng) {
      if (markersRef.current.chofer) {
        markersRef.current.chofer.setPosition({ lat: choferLat, lng: choferLng });
      } else {
        markersRef.current.chofer = new google.maps.Marker({
          position: { lat: choferLat, lng: choferLng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(ICON_CHOFER),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          },
          title: choferNombre || 'Ubicación del chofer',
          zIndex: 3,
        });
      }
      bounds.extend({ lat: choferLat, lng: choferLng });
    }

    // Marcador del destino
    if (destinoLat && destinoLng) {
      if (markersRef.current.destino) {
        markersRef.current.destino.setPosition({ lat: destinoLat, lng: destinoLng });
      } else {
        markersRef.current.destino = new google.maps.Marker({
          position: { lat: destinoLat, lng: destinoLng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(ICON_DESTINO),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          },
          title: destinoNombre || 'Destino',
          zIndex: 2,
        });
      }
      bounds.extend({ lat: destinoLat, lng: destinoLng });
    }

    // Ajustar zoom para mostrar todos los marcadores
    if (choferLat && choferLng && pasajeroLat && pasajeroLng) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [mapLoaded, choferLat, choferLng, pasajeroLat, pasajeroLng, destinoLat, destinoLng, choferNombre, destinoNombre]);

  // Fallback: Mapa HTML simple cuando Google Maps no está disponible
  if (mapError || typeof google === 'undefined') {
    return <SimpleMapFallback
      choferLat={choferLat}
      choferLng={choferLng}
      pasajeroLat={pasajeroLat}
      pasajeroLng={pasajeroLng}
      destinoLat={destinoLat}
      destinoLng={destinoLng}
      choferNombre={choferNombre}
      destinoNombre={destinoNombre}
    />;
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 bg-white/95 rounded-lg p-2 text-xs shadow-lg">
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span>Tu ubicación</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-amber-500 rounded-full mr-2 flex items-center justify-center text-white text-[6px]">🚕</div>
          <span>Ubicación del chofer</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span>Destino</span>
        </div>
      </div>

      {/* Indicador de carga */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente fallback simple (sin Google Maps)
function SimpleMapFallback({
  choferLat,
  choferLng,
  pasajeroLat,
  pasajeroLng,
  destinoLat,
  destinoLng,
  choferNombre,
  destinoNombre,
}: {
  choferLat?: number | null;
  choferLng?: number | null;
  pasajeroLat: number;
  pasajeroLng: number;
  destinoLat: number;
  destinoLng: number;
  choferNombre?: string;
  destinoNombre?: string;
}) {
  // Normalizar coordenadas a un espacio 2D (0-100%)
  const normalizar = (lat: number, lng: number, centro: typeof MITLA_CENTER) => {
    const factorLat = 20; // Escala vertical
    const factorLng = 20; // Escala horizontal
    return {
      x: 50 + (lng - centro.lng) * factorLng * 10,
      y: 50 - (lat - centro.lat) * factorLat * 10,
    };
  };

  const pasajeroPos = normalizar(pasajeroLat, pasajeroLng, MITLA_CENTER);
  const destinoPos = normalizar(destinoLat, destinoLng, MITLA_CENTER);
  const choferPos = choferLat && choferLng
    ? normalizar(choferLat, choferLng, MITLA_CENTER)
    : null;

  return (
    <div className="relative w-full h-full min-h-[300px] bg-gradient-to-b from-sky-300 to-sky-100 rounded-xl overflow-hidden">
      {/* Grid de calles */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {[...Array(10)].map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#666" strokeWidth="1" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`v-${i}`} x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#666" strokeWidth="1" />
        ))}
      </svg>

      {/* Línea de ruta */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <path
          d={`M ${pasajeroPos.x}% ${pasajeroPos.y}% Q 40% 30%, ${destinoPos.x}% ${destinoPos.y}%`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="8,4"
        />
        {choferPos && (
          <path
            d={`M ${choferPos.x}% ${choferPos.y}% Q ${(choferPos.x + pasajeroPos.x) / 2 / 100}% ${(choferPos.y + pasajeroPos.y) / 2 / 100}%, ${pasajeroPos.x}% ${pasajeroPos.y}%`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
          />
        )}
      </svg>

      {/* Marcador del pasajero */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${pasajeroPos.x}%`, top: `${pasajeroPos.y}%` }}
      >
        <div className="relative">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-white text-xs">📍</span>
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="bg-white px-2 py-0.5 rounded text-xs font-medium shadow">TÚ</span>
          </div>
        </div>
      </div>

      {/* Marcador del chofer */}
      {choferPos && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 heartbeat"
          style={{ left: `${choferPos.x}%`, top: `${choferPos.y}%` }}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <span className="text-white text-lg">🚕</span>
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="bg-white px-2 py-0.5 rounded text-xs font-medium shadow">
                {choferNombre?.split(' ')[0] || 'CHOFER'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Marcador del destino */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${destinoPos.x}%`, top: `${destinoPos.y}%` }}
      >
        <div className="relative">
          <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-white text-xs">🎯</span>
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="bg-white px-2 py-0.5 rounded text-xs font-medium shadow">
              {destinoNombre || 'Destino'}
            </span>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 bg-white/95 rounded-lg p-2 text-xs shadow-lg">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span>Tu ubicación</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
          <span>Ubicación del chofer</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Destino</span>
        </div>
      </div>

      {/* Indicador de GPS */}
      <div className="absolute top-3 right-3 bg-white/95 rounded-lg px-2 py-1 text-xs shadow-lg flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
        <span>GPS Mitla</span>
      </div>
    </div>
  );
}
