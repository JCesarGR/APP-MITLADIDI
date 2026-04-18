import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface DashboardStats {
  viajes: {
    total: number;
    completados: number;
    cancelados: number;
    en_progreso: number;
  };
  ingresos: {
    total_mxn: number;
    promedio_por_viaje: number;
    hoy: number;
    esta_semana: number;
    este_mes: number;
  };
  choferes: {
    total: number;
    activos: number;
    inactivos: number;
    por_badge: Record<string, number>;
  };
  timestamp: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  rol: string;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');

    if (!token || !userStr) {
      navigate('/admin/login');
      return;
    }

    setAdminUser(JSON.parse(userStr));
    fetchStats(token);
  }, [navigate]);

  const fetchStats = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar estadísticas');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const badgeColors: Record<string, string> = {
    principe: 'bg-slate-500',
    regular: 'bg-blue-500',
    experto: 'bg-amber-500',
    elite: 'bg-red-500',
  };

  const badgeLabels: Record<string, string> = {
    principe: 'Principiante',
    regular: 'Regular',
    experto: 'Experto',
    elite: 'ÉLITE',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <span className="text-2xl">🚕</span>
              <span className="text-xl font-bold text-white">TaxiMitla Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">
                {adminUser?.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 font-medium"
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
          <div className="flex space-x-1 py-2 overflow-x-auto">
            <NavLink to="/admin/dashboard" active>Dashboard</NavLink>
            <NavLink to="/admin/viajes">Viajes</NavLink>
            <NavLink to="/admin/choferes">Choferes</NavLink>
            <NavLink to="/admin/tarifas">Tarifas</NavLink>
            <NavLink to="/admin/reportes">Reportes</NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Viajes Totales"
            value={stats?.viajes.total || 0}
            icon="🚗"
            color="blue"
            subtitle={`${stats?.viajes.en_progreso || 0} en progreso`}
          />
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(stats?.ingresos.total_mxn || 0)}
            icon="💰"
            color="green"
            subtitle="Desde siempre"
          />
          <StatCard
            title="Choferes Activos"
            value={stats?.choferes.activos || 0}
            icon="👨‍✈️"
            color="amber"
            subtitle={`de ${stats?.choferes.total || 0} total`}
          />
          <StatCard
            title="Ingresos del Mes"
            value={formatCurrency(stats?.ingresos.este_mes || 0)}
            icon="📊"
            color="purple"
            subtitle="Este mes"
          />
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Income Breakdown */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Resumen de Ingresos</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                <span className="text-slate-400">Hoy</span>
                <span className="text-white font-bold">{formatCurrency(stats?.ingresos.hoy || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                <span className="text-slate-400">Esta Semana</span>
                <span className="text-white font-bold">{formatCurrency(stats?.ingresos.esta_semana || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                <span className="text-slate-400">Este Mes</span>
                <span className="text-white font-bold">{formatCurrency(stats?.ingresos.este_mes || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <span className="text-amber-400 font-medium">Promedio/Viaje</span>
                <span className="text-amber-400 font-bold">{formatCurrency(stats?.ingresos.promedio_por_viaje || 0)}</span>
              </div>
            </div>
          </div>

          {/* Trip Status */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Estado de Viajes</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                <span className="text-green-400 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Completados
                </span>
                <span className="text-white font-bold">{stats?.viajes.completados || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                <span className="text-yellow-400 flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  En Progreso
                </span>
                <span className="text-white font-bold">{stats?.viajes.en_progreso || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <span className="text-red-400 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  Cancelados
                </span>
                <span className="text-white font-bold">{stats?.viajes.cancelados || 0}</span>
              </div>
            </div>
          </div>

          {/* Drivers by Badge */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Choferes por Badge</h3>
            <div className="space-y-3">
              {stats?.choferes.por_badge && Object.entries(stats.choferes.por_badge).map(([badge, count]) => (
                <div key={badge} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 ${badgeColors[badge] || 'bg-slate-500'} rounded-full mr-3`}></span>
                    <span className="text-slate-300">{badgeLabels[badge] || badge}</span>
                  </div>
                  <span className="text-white font-bold">{count}</span>
                </div>
              ))}
              {!stats?.choferes.por_badge || Object.keys(stats.choferes.por_badge).length === 0 && (
                <p className="text-slate-500 text-center py-4">Sin datos de badges</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton to="/admin/choferes" icon="👨‍✈️" label="Ver Choferes" color="blue" />
            <QuickActionButton to="/admin/viajes" icon="🚗" label="Ver Viajes" color="green" />
            <QuickActionButton to="/admin/tarifas" icon="💰" label="Editar Tarifas" color="amber" />
            <QuickActionButton to="/admin/reportes" icon="📈" label="Reportes" color="purple" />
          </div>
        </div>
      </main>
    </div>
  );
}

function NavLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  const isActive = active || window.location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
        isActive
          ? 'bg-amber-500 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      {children}
    </Link>
  );
}

function StatCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle: string;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-xl rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-500 text-xs">{subtitle}</p>
    </div>
  );
}

function QuickActionButton({ to, icon, label, color }: {
  to: string;
  icon: string;
  label: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/50',
    green: 'hover:bg-green-500/20 border-green-500/30 hover:border-green-500/50',
    amber: 'hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/50',
    purple: 'hover:bg-purple-500/20 border-purple-500/30 hover:border-purple-500/50',
  };

  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center p-4 bg-slate-700/30 rounded-xl border border-transparent transition-all ${colors[color]}`}
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
    </Link>
  );
}
