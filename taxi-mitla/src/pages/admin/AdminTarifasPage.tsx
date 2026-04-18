import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface TarifaZona {
  zona: string;
  tarifa_base: number;
  recargo_nocturno_porcentaje: number;
  recargo_plaza_porcentaje: number;
  precio_km_adicional: number;
  activa: boolean;
}

const zonaInfo: Record<string, { label: string; emoji: string; descripcion: string }> = {
  centro: { label: 'Centro', emoji: '🏛️', descripcion: 'Plaza Principal y alrededores' },
  ruinas: { label: 'Zona Arqueológica', emoji: '🏛️', descripcion: 'Yagul, Mitla y zonas arqueológicas' },
  periferia: { label: 'Periferia', emoji: '🌳', descripcion: 'Colonias y zonas rurales' },
  foraneo: { label: 'Foráneo', emoji: '🛣️', descripcion: 'Fuera del perímetro urbano' },
};

export default function AdminTarifasPage() {
  const navigate = useNavigate();
  const [tarifas, setTarifas] = useState<TarifaZona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editZone, setEditZone] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TarifaZona>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchTarifas(token);
  }, [navigate]);

  const fetchTarifas = async (token: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/tarifas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al cargar tarifas');
      const data = await response.json();
      setTarifas(data.zonas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTarifa = async (zona: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSaving(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/tarifas/${zona}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error('Error al guardar');
      setMessage({ type: 'success', text: `Tarifa de ${zonaInfo[zona]?.label || zona} actualizada` });
      setEditZone(null);
      fetchTarifas(token);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (zona: TarifaZona) => {
    setEditZone(zona.zona);
    setEditData({ ...zona });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
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
            <Link to="/admin/tarifas" className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white">Tarifas</Link>
            <Link to="/admin/reportes" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50">Reportes</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Configuración de Tarifas</h1>
            <p className="text-slate-400 text-sm mt-1">Edita las tarifas por zona y recargos</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-500/20 border-green-500/50 text-green-400'
              : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tarifas.map((tarifa) => (
              <div
                key={tarifa.zona}
                className={`bg-slate-800/50 backdrop-blur-xl rounded-2xl border p-6 transition-all ${
                  editZone === tarifa.zona
                    ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'border-slate-700/50'
                }`}
              >
                {editZone === tarifa.zona ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        {zonaInfo[tarifa.zona]?.emoji} {zonaInfo[tarifa.zona]?.label || tarifa.zona}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        editData.activa ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {editData.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-sm mb-1">Tarifa Base (MXN)</label>
                      <input
                        type="number"
                        value={editData.tarifa_base}
                        onChange={(e) => setEditData({ ...editData, tarifa_base: parseFloat(e.target.value) })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-sm mb-1">Precio por km adicional (MXN)</label>
                      <input
                        type="number"
                        value={editData.precio_km_adicional}
                        onChange={(e) => setEditData({ ...editData, precio_km_adicional: parseFloat(e.target.value) })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        step="0.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Recargo Nocturno (%)</label>
                        <input
                          type="number"
                          value={editData.recargo_nocturno_porcentaje}
                          onChange={(e) => setEditData({ ...editData, recargo_nocturno_porcentaje: parseFloat(e.target.value) })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Recargo Plaza (%)</label>
                        <input
                          type="number"
                          value={editData.recargo_plaza_porcentaje}
                          onChange={(e) => setEditData({ ...editData, recargo_plaza_porcentaje: parseFloat(e.target.value) })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <span className="text-slate-400">Tarifa activa</span>
                      <button
                        onClick={() => setEditData({ ...editData, activa: !editData.activa })}
                        className={`w-12 h-6 rounded-full transition-colors ${editData.activa ? 'bg-green-500' : 'bg-slate-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editData.activa ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => saveTarifa(tarifa.zona)}
                        disabled={saving}
                        className="flex-1 bg-amber-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {saving ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          '💾 Guardar Cambios'
                        )}
                      </button>
                      <button
                        onClick={() => setEditZone(null)}
                        className="px-6 bg-slate-700 text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{zonaInfo[tarifa.zona]?.emoji}</span>
                        <div>
                          <h3 className="text-lg font-bold text-white">{zonaInfo[tarifa.zona]?.label || tarifa.zona}</h3>
                          <p className="text-slate-400 text-sm">{zonaInfo[tarifa.zona]?.descripcion}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        tarifa.activa ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {tarifa.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                        <span className="text-slate-400">Tarifa Base</span>
                        <span className="text-white font-bold text-xl">{formatCurrency(tarifa.tarifa_base)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-700/30 rounded-xl p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">🌙 Nocturno</p>
                          <p className="text-amber-400 font-bold">+{tarifa.recargo_nocturno_porcentaje}%</p>
                        </div>
                        <div className="bg-slate-700/30 rounded-xl p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">🎪 Plaza</p>
                          <p className="text-purple-400 font-bold">+{tarifa.recargo_plaza_porcentaje}%</p>
                        </div>
                      </div>

                      <div className="bg-slate-700/30 rounded-xl p-3 text-center">
                        <p className="text-slate-400 text-xs mb-1">Km adicional</p>
                        <p className="text-white font-bold">{formatCurrency(tarifa.precio_km_adicional)}/km</p>
                      </div>
                    </div>

                    <button
                      onClick={() => startEdit(tarifa)}
                      className="w-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium py-3 px-4 rounded-xl hover:bg-amber-500/30 transition-colors"
                    >
                      ✏️ Editar Tarifa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-blue-400 font-bold mb-3 flex items-center">
            <span className="mr-2">ℹ️</span> Información Importante
          </h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li>• <strong className="text-white">Recargo Nocturno:</strong> Se aplica de 22:00 a 06:00 (noche siguiente)</li>
            <li>• <strong className="text-white">Recargo Día de Plaza:</strong> Se aplica los lunes y jueves (días de tianguis)</li>
            <li>• <strong className="text-white">Km Adicional:</strong> Se cobra por cada kilómetro que exceda los primeros 3 km</li>
            <li>• <strong className="text-white">Tarifa Inactiva:</strong> Los viajes a esta zona no estarán disponibles para pasajeros</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
