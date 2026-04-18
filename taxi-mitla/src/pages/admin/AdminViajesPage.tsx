import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface Viaje {
  id: string;
  pasajero_nombre: string;
  pasajero_telefono: string;
  origen: { lat: number; lng: number; descripcion: string };
  destino_zona: string;
  destino: { lat: number; lng: number; descripcion: string };
  estado: string;
  tarifa_total: number;
  distancia_km: number;
  chofer_id: string | null;
  chofer_nombre: string | null;
  badge_chofer: string | null;
  creado_en: string;
  iniciado_en: string | null;
  finalizado_en: string | null;
}

const estadoColors: Record<string, string> = {
  solicitado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  aceptado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  en_camino: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  recogido: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  finalizado: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado_por_pasajero: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelado_por_chofer: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const estadoLabels: Record<string, string> = {
  solicitado: 'Solicitado',
  aceptado: 'Aceptado',
  en_camino: 'En Camino',
  recogido: 'Recogido',
  finalizado: 'Completado',
  cancelado_por_pasajero: 'Cancelado (Pasajero)',
  cancelado_por_chofer: 'Cancelado (Chofer)',
};

const zonaLabels: Record<string, string> = {
  centro: 'Centro',
  ruinas: 'Zona Arqueológica',
  periferia: 'Periferia',
  foraneo: 'Foráneo',
};

export default function AdminViajesPage() {
  const navigate = useNavigate();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchViajes(token);
  }, [navigate]);

  const fetchViajes = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/viajes?limite=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al cargar viajes');
      const data = await response.json();
      setViajes(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredViajes = filter === 'all'
    ? viajes
    : viajes.filter(v => v.estado === filter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const estados = ['all', 'solicitado', 'aceptado', 'en_camino', 'recogido', 'finalizado', 'cancelado_por_pasajero', 'cancelado_por_chofer'];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/admin/dashboard" className="text-2xl">🚕</Link>
              <span className="text-xl font-bold text-white">TaxiMitla Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/admin/dashboard" className="text-sm text-slate-400 hover:text-white">
                ← Volver al Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  navigate('/admin/login');
                }}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2">
            <Link to="/admin/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Dashboard</Link>
            <Link to="/admin/viajes" className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white">Viajes</Link>
            <Link to="/admin/choferes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Choferes</Link>
            <Link to="/admin/tarifas" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Tarifas</Link>
            <Link to="/admin/reportes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Reportes</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Historial de Viajes</h1>
          <div className="flex space-x-2 overflow-x-auto">
            {estados.map((estado) => (
              <button
                key={estado}
                onClick={() => setFilter(estado)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === estado
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {estado === 'all' ? `Todos (${viajes.length})` : `${estadoLabels[estado]} (${viajes.filter(v => v.estado === estado).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredViajes.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay viajes con este filtro</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredViajes.map((viaje) => (
              <div
                key={viaje.id}
                className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:bg-slate-800/70 transition-colors cursor-pointer"
                onClick={() => setSelectedViaje(viaje)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${estadoColors[viaje.estado] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {estadoLabels[viaje.estado] || viaje.estado}
                      </span>
                      <span className="text-slate-400 text-sm">{viaje.id.slice(0, 8)}...</span>
                      <span className="text-slate-500 text-sm">{formatDateTime(viaje.creado_en)}</span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        <span className="text-slate-300">{viaje.pasajero_nombre}</span>
                      </div>
                      <span className="text-slate-500">→</span>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-slate-300">{zonaLabels[viaje.destino_zona] || viaje.destino_zona}</span>
                      </div>
                    </div>

                    {viaje.chofer_nombre && (
                      <div className="flex items-center mt-2 text-sm">
                        <span className="text-slate-500">Chofer:</span>
                        <span className="text-slate-300 ml-2">{viaje.chofer_nombre}</span>
                        {viaje.badge_chofer && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold text-white ${
                            viaje.badge_chofer === 'elite' ? 'bg-red-500' :
                            viaje.badge_chofer === 'experto' ? 'bg-amber-500' :
                            viaje.badge_chofer === 'regular' ? 'bg-blue-500' : 'bg-slate-500'
                          }`}>
                            {viaje.badge_chofer.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Distancia</p>
                      <p className="text-white font-medium">{viaje.distancia_km.toFixed(1)} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Total</p>
                      <p className="text-green-400 font-bold text-lg">{formatCurrency(viaje.tarifa_total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Detalle */}
      {selectedViaje && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Detalle del Viaje</h2>
              <button onClick={() => setSelectedViaje(null)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${estadoColors[selectedViaje.estado] || ''}`}>
                  {estadoLabels[selectedViaje.estado] || selectedViaje.estado}
                </span>
                <span className="text-slate-400 text-sm">{selectedViaje.id}</span>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-slate-400 text-sm mb-2">Pasajero</h4>
                <p className="text-white font-medium">{selectedViaje.pasajero_nombre}</p>
                <p className="text-slate-400 text-sm">{selectedViaje.pasajero_telefono}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                  <p className="text-blue-400 text-sm mb-1">📍 Origen</p>
                  <p className="text-white font-medium">{selectedViaje.origen.descripcion || 'Ubicación del pasajero'}</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <p className="text-green-400 text-sm mb-1">🎯 Destino</p>
                  <p className="text-white font-medium">{zonaLabels[selectedViaje.destino_zona] || selectedViaje.destino_zona}</p>
                </div>
              </div>

              {selectedViaje.chofer_nombre && (
                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                  <h4 className="text-amber-400 text-sm mb-2">Chofer Asignado</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{selectedViaje.chofer_nombre}</p>
                      {selectedViaje.badge_chofer && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white mt-1 ${
                          selectedViaje.badge_chofer === 'elite' ? 'bg-red-500' :
                          selectedViaje.badge_chofer === 'experto' ? 'bg-amber-500' :
                          selectedViaje.badge_chofer === 'regular' ? 'bg-blue-500' : 'bg-slate-500'
                        }`}>
                          {selectedViaje.badge_chofer.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-3xl">🚕</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-slate-400 text-sm mb-3">Desglose de Tarifa</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tarifa {zonaLabels[selectedViaje.destino_zona]}</span>
                    <span className="text-white">${(selectedViaje.tarifa_total * 0.7).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distancia ({selectedViaje.distancia_km.toFixed(1)} km)</span>
                    <span className="text-white">${(selectedViaje.tarifa_total * 0.2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-600 pt-2">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-green-400 font-bold text-lg">{formatCurrency(selectedViaje.tarifa_total)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Creado</p>
                  <p className="text-white text-sm">{formatDateTime(selectedViaje.creado_en)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Iniciado</p>
                  <p className="text-white text-sm">{selectedViaje.iniciado_en ? formatDateTime(selectedViaje.iniciado_en) : '—'}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Finalizado</p>
                  <p className="text-white text-sm">{selectedViaje.finalizado_en ? formatDateTime(selectedViaje.finalizado_en) : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
