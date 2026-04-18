import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const getCurrentPosition = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Intentar con Capacitor primero (mejor para móviles)
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
      });
    } catch (geoError: any) {
      console.warn('Capacitor Geolocation falló, usando browser API:', geoError);

      // Fallback a API del navegador
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setState({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              error: null,
              loading: false,
            });
          },
          (error) => {
            setState({
              latitude: null,
              longitude: null,
              error: error.message,
              loading: false,
            });
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setState({
          latitude: null,
          longitude: null,
          error: 'Geolocalización no disponible',
          loading: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return { ...state, refresh: getCurrentPosition };
}
