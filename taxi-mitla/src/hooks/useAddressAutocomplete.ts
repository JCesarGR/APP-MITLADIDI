import { useState, useCallback, useRef, useEffect } from 'react';

// Configuración de Mitla (Oaxaca, México)
const MITLA_CENTER = { lat: 16.9548, lng: -96.5122 }; // Coordenadas del centro de Mitla
const MITLA_BOUNDS = {
  north: 16.98,
  south: 16.92,
  east: -96.48,
  west: -96.55,
};
const SEARCH_RADIUS_KM = 15; // Radio de búsqueda en km

interface AddressResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

interface AutocompleteHook {
  results: AddressResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

// Plugin simple de autocompletado (funciona sin API key para demo)
class SimpleAutocomplete {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async search(query: string): Promise<AddressResult[]> {
    if (!query || query.length < 3) return [];

    // Lugares comunes de Mitla para autocompletado
    const lugaresComunes = [
      { placeId: 'mitla-plaza', description: 'Plaza Principal de Mitla', mainText: 'Plaza Principal', secondaryText: 'Centro, Mitla', lat: 16.9548, lng: -96.5122 },
      { placeId: 'mitla-ruinas', description: 'Zona Arqueológica de Mitla', mainText: 'Zona Arqueológica', secondaryText: 'Ruinas de Mitla', lat: 16.9630, lng: -96.5100 },
      { placeId: 'mitla-mercado', description: 'Mercado Municipal', mainText: 'Mercado Municipal', secondaryText: 'Centro, Mitla', lat: 16.9520, lng: -96.5140 },
      { placeId: 'mitla-iglesia', description: 'Iglesia de San Miguel', mainText: 'Iglesia de San Miguel', secondaryText: 'Centro, Mitla', lat: 16.9555, lng: -96.5115 },
      { placeId: 'mitla-parada', description: 'Parada de Trucks', mainText: 'Parada de Trucks', secondaryText: 'Periferia, Mitla', lat: 16.9480, lng: -96.5200 },
      { placeId: 'mitla-templo', description: 'Templo de San Juan', mainText: 'Templo de San Juan', secondaryText: 'Centro, Mitla', lat: 16.9535, lng: -96.5135 },
      { placeId: 'mitla-cecet', description: 'CECET', mainText: 'CECET', secondaryText: 'Mitla', lat: 16.9580, lng: -96.5080 },
      { placeId: 'mitla-glorieta', description: 'Glorieta de Mitla', mainText: 'Glorieta', secondaryText: 'Entrada a Mitla', lat: 16.9500, lng: -96.5180 },
      { placeId: 'mitla-banqueta', description: 'La Banqueta', mainText: 'La Banqueta', secondaryText: 'Mitla', lat: 16.9560, lng: -96.5100 },
      { placeId: 'mitla-panteon', description: 'Panteón Municipal', mainText: 'Panteón Municipal', secondaryText: 'Periferia, Mitla', lat: 16.9490, lng: -96.5150 },
    ];

    // Filtrar por query
    const queryLower = query.toLowerCase();
    const filtered = lugaresComunes.filter(
      (l) =>
        l.description.toLowerCase().includes(queryLower) ||
        l.mainText.toLowerCase().includes(queryLower) ||
        l.secondaryText.toLowerCase().includes(queryLower)
    );

    return filtered.map((l) => ({
      placeId: l.placeId,
      description: l.description,
      mainText: l.mainText,
      secondaryText: l.secondaryText,
      lat: l.lat,
      lng: l.lng,
    }));
  }
}

// Google Maps Places Autocomplete Hook (con API key real)
class GooglePlacesAutocomplete {
  private sessionToken: string | null = null;
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;

  constructor() {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
  }

  async search(query: string): Promise<AddressResult[]> {
    if (!query || query.length < 3 || !this.autocompleteService) {
      return [];
    }

    return new Promise((resolve) => {
      this.autocompleteService!.getPlacePredictions(
        {
          input: query,
          location: new google.maps.LatLng(MITLA_CENTER.lat, MITLA_CENTER.lng),
          radius: SEARCH_RADIUS_KM * 1000, // Convertir a metros
          bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(MITLA_BOUNDS.south, MITLA_BOUNDS.west),
            new google.maps.LatLng(MITLA_BOUNDS.north, MITLA_BOUNDS.east)
          ),
          componentRestrictions: { country: 'mx' }, // Solo México
          sessionToken: this.sessionToken,
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }

          resolve(
            predictions.map((p) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || '',
              lat: 0, // Se obtiene al seleccionar
              lng: 0,
            }))
          );
        }
      );
    });
  }

  async getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.placesService) return null;

    return new Promise((resolve) => {
      this.placesService!.getDetails(
        { placeId, fields: ['geometry'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            resolve({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }
}

export function useAddressAutocomplete(): AutocompleteHook {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simpleAutocomplete = useRef(new SimpleAutocomplete());

  const search = useCallback(async (query: string) => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    // Debounce de 300ms
    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        // Verificar si Google Maps está disponible
        if (typeof google !== 'undefined' && google.maps?.places) {
          const googleAutocomplete = new GooglePlacesAutocomplete();
          const googleResults = await googleAutocomplete.search(query);
          if (googleResults.length > 0) {
            setResults(googleResults);
            setLoading(false);
            return;
          }
        }

        // Fallback al autocompletado simple
        const simpleResults = await simpleAutocomplete.current.search(query);
        setResults(simpleResults);
      } catch (err) {
        setError('Error al buscar direcciones');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { results, loading, error, search, clear };
}

export { MITLA_CENTER, MITLA_BOUNDS, SEARCH_RADIUS_KM };
export type { AddressResult };
