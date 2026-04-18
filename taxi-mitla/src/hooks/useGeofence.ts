import { useState, useEffect, useCallback } from 'react';

interface GeofenceConfig {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  onEnter?: () => void;
  onExit?: () => void;
}

/**
 * Hook para geofencing - Detecta cuando el usuario entra/sale de un radio determinado
 * Usa la fórmula de Haversine para calcular distancias
 */
export function useGeofence(config: GeofenceConfig) {
  const { centerLat, centerLng, radiusMeters, onEnter, onExit } = config;
  const [isInside, setIsInside] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fórmula de Haversine para calcular distancia entre dos puntos
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const toRad = (value: number): number => (value * Math.PI) / 180;

  useEffect(() => {
    let watchId: number | null = null;
    let previousState = false;

    const handlePosition = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const currentDistance = calculateDistance(latitude, longitude, centerLat, centerLng);
      const currentlyInside = currentDistance <= radiusMeters;

      setDistance(currentDistance);
      setLastUpdate(new Date());
      setError(null);

      // Detectar cambio de estado
      if (currentlyInside !== previousState) {
        previousState = currentlyInside;
        setIsInside(currentlyInside);

        if (currentlyInside && onEnter) {
          console.log('🟢 Entró a la geocerca');
          onEnter();
        } else if (!currentlyInside && onExit) {
          console.log('🔴 Salió de la geocerca');
          onExit();
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(err.message);
      console.error('Geofence error:', err);
    };

    // Iniciar watch si está disponible
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
    } else {
      setError('Geolocalización no disponible');
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [centerLat, centerLng, radiusMeters, onEnter, onExit, calculateDistance]);

  return {
    isInside,
    distance,
    lastUpdate,
    error,
    // Info para UI
    progress: distance !== null ? Math.max(0, Math.min(100, ((radiusMeters - distance) / radiusMeters) * 100)) : null,
    remaining: distance !== null ? Math.max(0, radiusMeters - distance) : null,
  };
}

/**
 * Hook simplificado para detectar llegada a destino
 * Radio de 50 metros para llegada automática
 */
export function useArrivalDetection(
  destinationLat: number,
  destinationLng: number,
  onArrival: () => void,
  radiusMeters: number = 50
) {
  const [hasArrived, setHasArrived] = useState(false);

  const { isInside, distance, error } = useGeofence({
    centerLat: destinationLat,
    centerLng: destinationLng,
    radiusMeters,
    onEnter: () => {
      if (!hasArrived) {
        setHasArrived(true);
        onArrival();
      }
    },
  });

  return {
    hasArrived,
    isInside,
    distance,
    error,
    // Porcentaje de aproximación (0-100%)
    approachPercentage: distance !== null
      ? Math.max(0, Math.min(100, ((radiusMeters * 2 - distance) / (radiusMeters * 2)) * 100))
      : null,
  };
}

/**
 * Hook para calcular distancia a un punto
 */
export function useDistanceToPoint(targetLat: number, targetLng: number) {
  const [distance, setDistance] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    const updateDistance = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ lat: latitude, lng: longitude });

            // Haversine
            const R = 6371000;
            const dLat = ((targetLat - latitude) * Math.PI) / 180;
            const dLng = ((targetLng - longitude) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((latitude * Math.PI) / 180) *
              Math.cos((targetLat * Math.PI) / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            setDistance(R * c);
          },
          (error) => console.error('Error getting position:', error),
          { enableHighAccuracy: true }
        );
      }
    };

    updateDistance();
    const interval = setInterval(updateDistance, 10000); // Actualizar cada 10s

    return () => {
      clearInterval(interval);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [targetLat, targetLng]);

  return {
    distance,
    currentPosition,
    formattedDistance: distance !== null
      ? distance < 1000
        ? `${Math.round(distance)} m`
        : `${(distance / 1000).toFixed(1)} km`
      : 'Calculando...',
  };
}