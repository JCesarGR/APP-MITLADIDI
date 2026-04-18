import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface Chofer {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  unidad: string;
  badge: string;
  badge_valor: number;
  viajes_completados: number;
  calificacion_promedio: number;
  total_ingresos: number;
  activo: boolean;
  conectado: boolean;
  ubicacion_actual: { lat: number; lng: number } | null;
  creado_en: string;
  ultimo_viaje: string | null;
}

export default function AdminChoferesPage() {
  const navigate = useNavigate();
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedChofer, setSelectedChofer] = useState<Chofer | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchChoferes(token);
  }, [navigate]);

  const fetchChoferes = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/choferes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al cargar choferes');
      const data = await response.json();
      setChoferes(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (choferId: string, currentStatus: boolean) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/choferes/${choferId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !currentStatus }),
      });

      if (response.ok) {
        setChoferes(choferes.map(c =>
          c.id === choferId ? { ...c, activo: !currentStatus } : c
        ));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredChoferes = choferes.filter(c => {
    if (filter === 'active') return c.activo;
    if (filter === 'inactive') return !c.activo;
    return true;
  });

  const badgeColors: Record<string, string> = {
    principe: 'bg-slate-500',
    regular: 'bg-blue-500',
    experto: 'bg-amber-500',
    elite: 'bg-red-500',
  };

  const badgeLabels: Record<string, string> = {
    principe: '🌱 Principiante',
    regular: '⭐ Regular',
    experto: '🔥 Experto',
    elite: '👑 ÉLITE',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            <Link to="/admin/viajes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Viajes</Link>
            <Link to="/admin/choferes" className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white">Choferes</Link>
            <Link to="/admin/tarifas" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Tarifas</Link>
            <Link to="/admin/reportes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Reportes</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Gestión de Choferes</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Todos ({choferes.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'active' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Activos ({choferes.filter(c => c.activo).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'inactive' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Inactivos ({choferes.filter(c => !c.activo).length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredChoferes.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay choferes registrados</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Chofer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Badge</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Unidad</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Viajes</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Ingresos</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Estado</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredChoferes.map((chofer) => (
                  <tr key={chofer.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{chofer.nombre}</p>
                        <p className="text-slate-400 text-sm">{chofer.telefono}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${badgeColors[chofer.badge] || 'bg-slate-500'}`}>
                        {badgeLabels[chofer.badge] || chofer.badge}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{chofer.unidad}</td>
                    <td className="px-6 py-4 text-slate-300">{chofer.viajes_completados}</td>
                    <td className="px-6 py-4 text-green-400 font-medium">{formatCurrency(chofer.total_ingresos)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${chofer.conectado ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        <span className="text-sm text-slate-400">{chofer.conectado ? 'Conectado' : 'Desconectado'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedChofer(chofer)}
                          className="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500 transition-colors"
                        >
                          Ver Detalle
                        </button>
                        <button
                          onClick={() => toggleActivo(chofer.id, chofer.activo)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            chofer.activo
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                        >
                          {chofer.activo ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de Detalle */}
      {selectedChofer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Detalle del Chofer</h2>
              <button onClick={() => setSelectedChofer(null)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-700/50 rounded-xl">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-3xl">
                  👨‍✈️
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{selectedChofer.nombre}</p>
                  <p className="text-slate-400">{selectedChofer.telefono}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Badge</p>
                  <p className="text-white font-bold">{badgeLabels[selectedChofer.badge] || selectedChofer.badge}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Unidad</p>
                  <p className="text-white font-bold">{selectedChofer.unidad}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Viajes Completados</p>
                  <p className="text-white font-bold">{selectedChofer.viajes_completados}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Total Ingresos</p>
                  <p className="text-green-400 font-bold">{formatCurrency(selectedChofer.total_ingresos)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Calificación</p>
                  <p className="text-white font-bold">{selectedChofer.calificacion_promedio.toFixed(1)} / 5</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Último Viaje</p>
                  <p className="text-white font-bold">{selectedChofer.ultimo_viaje ? formatDate(selectedChofer.ultimo_viaje) : 'Sin viajes'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${selectedChofer.activo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-slate-300">{selectedChofer.activo ? 'Activo' : 'Suspendido'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${selectedChofer.conectado ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span className="text-slate-300">{selectedChofer.conectado ? 'En línea' : 'Desconectado'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
