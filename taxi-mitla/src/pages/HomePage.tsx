import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { crearViaje } from '../services/api';
import { useApp } from '../context/AppContext';
import { ZONAS, TarifaInfo } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { AddressResult } from '../hooks/useAddressAutocomplete';

export default function HomePage() {
  const navigate = useNavigate();
  const { setViajeActivo } = useApp();
  const { latitude, longitude, loading: geoLoading, error: geoError, refresh } = useGeolocation();

  const [pasajeroNombre, setPasajeroNombre] = useState('');
  const [pasajeroTelefono, setPasajeroTelefono] = useState('');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<AddressResult | null>(null);
  const [mostrarAutocompletado, setMostrarAutocompletado] = useState(false);
  const [tarifaInfo, setTarifaInfo] = useState<TarifaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTarifas, setShowTarifas] = useState(false);
  const [tarifasSimuladas, setTarifasSimuladas] = useState<Record<string, TarifaInfo>>({});

  // Calcular distancia entre dos puntos (fórmula Haversine)
  const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Recalcular tarifa cuando cambia el destino
  useEffect(() => {
    if (destinoSeleccionado && latitude && longitude) {
      const distancia = calcularDistancia(latitude, longitude, destinoSeleccionado.lat, destinoSeleccionado.lng);
      calcularTarifaConDistancia(destinoSeleccionado.zona, distancia);
    } else if (zonaSeleccionada) {
      calcularTarifaSimulada(zonaSeleccionada);
    }
  }, [destinoSeleccionado, zonaSeleccionada]);

  useEffect(() => {
    cargarTarifasSimuladas();
  }, []);

  const calcularTarifaSimulada = (zona: string) => {
    const tarifasBase: Record<string, number> = { centro: 25, ruinas: 35, periferia: 45, foraneo: 60 };
    const hora = new Date().getHours();
    const esNocturno = hora >= 22 || hora < 6;
    const diaSemana = new Date().getDay();
    const esDiaPlaza = diaSemana === 1 || diaSemana === 4;
    const base = tarifasBase[zona] || 25;
    const recargoNocturno = esNocturno ? base * 0.2 : 0;
    const recargoPlaza = esDiaPlaza ? base * 0.5 : 0;
    setTarifaInfo({
      tarifa_base: base, costo_km: 0, recargo_nocturno: recargoNocturno,
      recargo_plaza: recargoPlaza, tarifa_total: base + recargoNocturno + recargoPlaza,
      es_nocturno: esNocturno, es_dia_plaza: esDiaPlaza, zona, distancia_km: 5,
    });
  };

  const calcularTarifaConDistancia = (zona: string, distanciaKm: number) => {
    const tarifasBase: Record<string, number> = { centro: 25, ruinas: 35, periferia: 45, foraneo: 60 };
    const PRECIO_KM_ADICIONAL = 8;
    const hora = new Date().getHours();
    const esNocturno = hora >= 22 || hora < 6;
    const diaSemana = new Date().getDay();
    const esDiaPlaza = diaSemana === 1 || diaSemana === 4;
    const base = tarifasBase[zona] || 25;
    const kmAdicionales = Math.max(0, distanciaKm - 3);
    const costoKm = kmAdicionales * PRECIO_KM_ADICIONAL;
    const subtotal = base + costoKm;
    const recargoNocturno = esNocturno ? subtotal * 0.2 : 0;
    const recargoPlaza = esDiaPlaza ? subtotal * 0.5 : 0;
    setTarifaInfo({
      tarifa_base: base, costo_km: costoKm, recargo_nocturno: recargoNocturno,
      recargo_plaza: recargoPlaza, tarifa_total: subtotal + recargoNocturno + recargoPlaza,
      es_nocturno: esNocturno, es_dia_plaza: esDiaPlaza, zona, distancia_km: distanciaKm,
    });
  };

  const cargarTarifasSimuladas = () => {
    const tarifas: Record<string, TarifaInfo> = {};
    const hora = new Date().getHours();
    const esNocturno = hora >= 22 || hora < 6;
    const diaSemana = new Date().getDay();
    const esDiaPlaza = diaSemana === 1 || diaSemana === 4;
    const tarifasBase: Record<string, number> = { centro: 25, ruinas: 35, periferia: 45, foraneo: 60 };
    ZONAS.forEach(({ value }) => {
      const base = tarifasBase[value] || 25;
      tarifas[value] = {
        tarifa_base: base, costo_km: 0, recargo_nocturno: esNocturno ? base * 0.2 : 0,
        recargo_plaza: esDiaPlaza ? base * 0.5 : 0,
        tarifa_total: base + (esNocturno ? base * 0.2 : 0) + (esDiaPlaza ? base * 0.5 : 0),
        es_nocturno: esNocturno, es_dia_plaza: esDiaPlaza, zona: value, distancia_km: 5,
      };
    });
    setTarifasSimuladas(tarifas);
  };

  const handleDestinoSelect = (result: AddressResult) => {
    setDestinoSeleccionado(result);
    setMostrarAutocompletado(false);
    if (result.mainText.toLowerCase().includes('ruin') || result.mainText.includes('Arqueológica')) {
      setZonaSeleccionada('ruinas');
    } else if (result.mainText.toLowerCase().includes('plaza') || result.mainText.includes('Principal')) {
      setZonaSeleccionada('centro');
    } else {
      setZonaSeleccionada('periferia');
    }
  };

  const handleZonaSelect = (zona: string) => {
    setZonaSeleccionada(zona);
    setDestinoSeleccionado(null);
    setMostrarAutocompletado(false);
  };

  const handleSolicitarViaje = async () => {
    if (!pasajeroNombre || !pasajeroTelefono) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      alert('Por favor completa tu nombre y teléfono');
      return;
    }
    if (!zonaSeleccionada && !destinoSeleccionado) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      alert('Por favor selecciona un destino');
      return;
    }
    if (!latitude || !longitude) {
      alert('No pudimos obtener tu ubicación. Por favor permite el acceso a ubicación.');
      return;
    }

    setLoading(true);
    try {
      const destinoZona = destinoSeleccionado?.zona || zonaSeleccionada || 'centro';
      const destinoLat = destinoSeleccionado?.lat || latitude + 0.01;
      const destinoLng = destinoSeleccionado?.lng || longitude + 0.01;
      const response = await crearViaje({
        pasajero_nombre: pasajeroNombre, pasajero_telefono: pasajeroTelefono,
        origen: { lat: latitude, lng: longitude, descripcion: 'Mi ubicación actual' },
        destino_zona: destinoZona,
        destino: {
          lat: destinoLat, lng: destinoLng,
          descripcion: destinoSeleccionado?.mainText || ZONAS.find((z) => z.value === destinoZona)?.label,
        },
      });
      await Haptics.impact({ style: ImpactStyle.Medium });
      setViajeActivo(response.id);
      navigate(`/confirmacion/${response.id}`);
    } catch (error) {
      console.error('Error al crear viaje:', error);
      const destinoZona = destinoSeleccionado?.zona || zonaSeleccionada || 'centro';
      const viajeSimulado = {
        id: 'demo-' + Date.now(), pasajero_nombre: pasajeroNombre, pasajero_telefono: pasajeroTelefono,
        origen: { lat: latitude, lng: longitude, descripcion: 'Mi ubicación' },
        destino_zona: destinoZona,
        destino: {
          lat: destinoSeleccionado?.lat || latitude + 0.01,
          lng: destinoSeleccionado?.lng || longitude + 0.01,
          descripcion: destinoSeleccionado?.mainText || ZONAS.find((z) => z.value === destinoZona)?.label
        },
        estado: 'solicitado', tarifa_total: tarifaInfo?.tarifa_total || 25,
        distancia_km: tarifaInfo?.distancia_km || 5, chofer: null,
      };
      localStorage.setItem('viajeDemo', JSON.stringify(viajeSimulado));
      navigate(`/confirmacion/${viajeSimulado.id}`);
    } finally {
      setLoading(false);
    }
  };

  const puedeSolicitar = pasajeroNombre && pasajeroTelefono && (zonaSeleccionada || destinoSeleccionado);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 safe-area-inset-top">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🚕 TaxiMitla</h1>
            <p className="text-primary-200 text-sm">Transporte local en Villa de Mitla</p>
          </div>
          <button onClick={() => navigate('/chofer/login')} className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Soy Chofer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl min-h-screen px-4 py-6">
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">📍 Tu Ubicación</label>
          <div className="bg-primary-50 rounded-xl p-4 flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xl">📍</span>
            </div>
            <div className="flex-1">
              {geoLoading ? (<p className="text-gray-500">Obteniendo ubicación...</p>)
               : geoError ? (<div><p className="text-red-500 text-sm">{geoError}</p><button onClick={refresh} className="text-primary-500 text-sm font-medium mt-1">Reintentar</button></div>)
               : latitude && longitude ? (<><p className="text-gray-800 font-medium">Ubicación detectada</p><p className="text-gray-500 text-sm">Mitla, Oaxaca</p></>)
               : (<p className="text-gray-500">Sin ubicación</p>)}
            </div>
            <button onClick={refresh} className="text-primary-500 p-2"><span className="text-xl">🔄</span></button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">👤 Tus Datos</label>
          <div className="space-y-3">
            <input type="text" placeholder="Tu nombre completo" value={pasajeroNombre}
              onChange={(e) => setPasajeroNombre(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="tel" placeholder="Tu teléfono (para contactarte)" value={pasajeroTelefono}
              onChange={(e) => setPasajeroTelefono(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-700 font-medium">🎯 ¿A dónde vas?</label>
            <button onClick={() => setMostrarAutocompletado(!mostrarAutocompletado)}
              className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${mostrarAutocompletado ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-600'}`}>
              {mostrarAutocompletado ? 'Usar zonas' : 'Buscar dirección'}
            </button>
          </div>

          {mostrarAutocompletado ? (
            <AddressAutocomplete value={destinoSeleccionado?.mainText || ''} onChange={() => {}}
              onSelect={handleDestinoSelect} placeholder="Escribe el nombre del lugar..." label="" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ZONAS.map((zona) => (
                <button key={zona.value} onClick={() => handleZonaSelect(zona.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${zonaSeleccionada === zona.value && !destinoSeleccionado ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}>
                  <div className="text-2xl mb-1">
                    {zona.value === 'centro' && '🏛️'}{zona.value === 'ruinas' && '🏛️'}{zona.value === 'periferia' && '🌳'}{zona.value === 'foraneo' && '🛣️'}
                  </div>
                  <p className="font-semibold text-gray-800">{zona.label}</p>
                  <p className="text-xs text-gray-500">{zona.descripcion}</p>
                  {tarifasSimuladas[zona.value] && (<p className="text-primary-600 font-bold mt-1">${tarifasSimuladas[zona.value].tarifa_total.toFixed(0)}</p>)}
                </button>
              ))}
            </div>
          )}
        </div>

        {destinoSeleccionado && (
          <div className="mb-6 bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎯</span>
              <div>
                <p className="font-semibold text-gray-800">{destinoSeleccionado.mainText}</p>
                <p className="text-sm text-gray-500">{destinoSeleccionado.secondaryText}</p>
              </div>
              <button onClick={() => setDestinoSeleccionado(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>
        )}

        {showTarifas && tarifaInfo && (
          <div className="mb-6 bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">💰 Desglose de Tarifa</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Tarifa base ({tarifaInfo.zona})</span><span className="font-medium">${tarifaInfo.tarifa_base.toFixed(2)}</span></div>
              {tarifaInfo.costo_km > 0 && (<div className="flex justify-between"><span className="text-gray-600">Distancia ({tarifaInfo.distancia_km.toFixed(1)} km)</span><span className="font-medium">+${tarifaInfo.costo_km.toFixed(2)}</span></div>)}
              {tarifaInfo.recargo_nocturno > 0 && (<div className="flex justify-between text-amber-600"><span>🌙 Recargo nocturno (20%)</span><span className="font-medium">+${tarifaInfo.recargo_nocturno.toFixed(2)}</span></div>)}
              {tarifaInfo.recargo_plaza > 0 && (<div className="flex justify-between text-purple-600"><span>🎪 Día de plaza (50%)</span><span className="font-medium">+${tarifaInfo.recargo_plaza.toFixed(2)}</span></div>)}
              <div className="flex justify-between text-lg font-bold text-primary-600 pt-2 border-t"><span>Total</span><span>${tarifaInfo.tarifa_total.toFixed(2)} MXN</span></div>
            </div>
            {(tarifaInfo.es_nocturno || tarifaInfo.es_dia_plaza) && (
              <p className="text-xs text-gray-500 mt-2">
                {tarifaInfo.es_nocturno && '🌙 Tarifa nocturna activa (22:00 - 06:00)'}
                {tarifaInfo.es_dia_plaza && ' 📅 Día de plaza (lunes y jueves)'}
              </p>
            )}
          </div>
        )}

        {!showTarifas && puedeSolicitar && tarifaInfo && (
          <div className="mb-6 bg-primary-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tarifa estimada</p>
                <p className="text-2xl font-bold text-primary-600">${tarifaInfo.tarifa_total.toFixed(2)}</p>
              </div>
              <button onClick={() => setShowTarifas(true)} className="text-primary-500 text-sm font-medium">Ver desglose</button>
            </div>
          </div>
        )}

        <button onClick={handleSolicitarViaje} disabled={loading || !puedeSolicitar}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${loading || !puedeSolicitar ? 'bg-gray-300 text-gray-500' : 'bg-primary-500 text-white active:bg-primary-600'}`}>
          {loading ? (<span className="flex items-center justify-center"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Buscando taxi cercano...</span>) : '🚖 Solicitar Taxi'}
        </button>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🚗 Asignación automática por cercanía</p>
          <p className="mt-1">⏱️ Tiempo estimado: 5-15 minutos</p>
        </div>
      </div>
    </div>
  );
}
