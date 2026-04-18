import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface IngresoData {
  fecha: string;
  ingresos: number;
  viajes: number;
}

interface RankingChofer {
  chofer_id: string;
  nombre: string;
  badge: string;
  total_ingresos: number;
  viajes_completados: number;
}

export default function AdminReportesPage() {
  const navigate = useNavigate();
  const [ingresos, setIngresos] = useState<IngresoData[]>([]);
  const [ranking, setRanking] = useState<RankingChofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ingresos' | 'ranking'>('ingresos');
  const [dateRange, setDateRange] = useState({
    desde: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchReportes(token);
  }, [navigate, dateRange]);

  const fetchReportes = async (token: string) => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const [ingresosRes, rankingRes] = await Promise.all([
        fetch(`${API_URL}/admin/reportes/ingresos?fecha_desde=${dateRange.desde}&fecha_hasta=${dateRange.hasta}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/reportes/choferes-ranking?limite=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ingresosRes.ok) {
        const data = await ingresosRes.json();
        setIngresos(data.data || []);
      }

      if (rankingRes.ok) {
        const data = await rankingRes.json();
        setRanking(data.ranking || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const totalIngresos = ingresos.reduce((sum, item) => sum + item.ingresos, 0);
  const totalViajes = ingresos.reduce((sum, item) => sum + item.viajes, 0);
  const promedioDiario = totalIngresos / Math.max(ingresos.length, 1);

  const maxIngresos = Math.max(...ingresos.map(i => i.ingresos), 1);

  const badgeColors: Record<string, string> = {
    principe: 'bg-slate-500',
    regular: 'bg-blue-500',
    experto: 'bg-amber-500',
    elite: 'bg-red-500',
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
            <Link to="/admin/choferes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Choferes</Link>
            <Link to="/admin/tarifas" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Tarifas</Link>
            <Link to="/admin/reportes" className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white">Reportes</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-white">Reportes y Estadísticas</h1>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-slate-400 text-sm">Desde:</label>
              <input
                type="date"
                value={dateRange.desde}
                onChange={(e) => setDateRange({ ...dateRange, desde: e.target.value })}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-slate-400 text-sm">Hasta:</label>
              <input
                type="date"
                value={dateRange.hasta}
                onChange={(e) => setDateRange({ ...dateRange, hasta: e.target.value })}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('ingresos')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'ingresos'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            📊 Reporte de Ingresos
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'ranking'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            🏆 Ranking de Choferes
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'ingresos' ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
                <p className="text-green-400 text-sm mb-1">Total Período</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalIngresos)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
                <p className="text-blue-400 text-sm mb-1">Total Viajes</p>
                <p className="text-2xl font-bold text-white">{totalViajes}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                <p className="text-purple-400 text-sm mb-1">Promedio Diario</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(promedioDiario)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30">
                <p className="text-amber-400 text-sm mb-1">Días Activos</p>
                <p className="text-2xl font-bold text-white">{ingresos.length}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-6">Ingresos Diarios</h3>
              {ingresos.length > 0 ? (
                <div className="space-y-2">
                  {ingresos.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-slate-400">{formatDate(item.fecha)}</div>
                      <div className="flex-1 bg-slate-700/30 rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(item.ingresos / maxIngresos) * 100}%` }}
                        >
                          {item.ingresos > maxIngresos * 0.5 && (
                            <span className="text-white text-xs font-medium">{formatCurrency(item.ingresos)}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        {item.ingresos <= maxIngresos * 0.5 && (
                          <span className="text-green-400 text-sm font-medium">{formatCurrency(item.ingresos)}</span>
                        )}
                      </div>
                      <div className="w-12 text-right text-slate-400 text-sm">{item.viajes} 🚗</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No hay datos de ingresos para el período seleccionado
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Fecha</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Ingresos</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Viajes</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Promedio/Viaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {ingresos.slice().reverse().map((item, index) => (
                    <tr key={index} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-white">{formatDate(item.fecha)}</td>
                      <td className="px-6 py-4 text-right text-green-400 font-medium">{formatCurrency(item.ingresos)}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{item.viajes}</td>
                      <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(item.viajes > 0 ? item.ingresos / item.viajes : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Ranking */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-6">🏆 Top 10 Choferes por Ingresos</h3>
              {ranking.length > 0 ? (
                <div className="space-y-4">
                  {ranking.map((chofer, index) => (
                    <div
                      key={chofer.chofer_id}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-slate-400' :
                          index === 2 ? 'bg-amber-600' :
                          'bg-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">{chofer.nombre}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${badgeColors[chofer.badge] || 'bg-slate-500'}`}>
                              {chofer.badge?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm">{chofer.viajes_completados} viajes completados</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-lg">{formatCurrency(chofer.total_ingresos)}</p>
                        <p className="text-slate-400 text-sm">{formatCurrency(chofer.total_ingresos / Math.max(chofer.viajes_completados, 1))} promedio</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No hay datos de choferes aún
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
