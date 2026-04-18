import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginChofer, registerChofer } from '../services/api';
import { useApp } from '../context/AppContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function ChoferLoginPage() {
  const navigate = useNavigate();
  const { setChofer } = useApp();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [unidad, setUnidad] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!telefono || !password || (!isLogin && (!nombre || !unidad))) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    await Haptics.impact({ style: ImpactStyle.Light });

    try {
      if (isLogin) {
        const response = await loginChofer(telefono, password);
        setChofer(response.chofer_id, response.access_token, response.nombre);
        navigate('/chofer');
      } else {
        await registerChofer({
          nombre,
          telefono,
          password,
          unidad,
        });
        // Auto-login after register
        const response = await loginChofer(telefono, password);
        setChofer(response.chofer_id, response.access_token, response.nombre);
        navigate('/chofer');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 safe-area-inset-top">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isLogin ? '👨‍✈️ Panel del Chofer' : '📝 Registro de Chofer'}
            </h1>
            <p className="text-primary-200 text-sm">TaxiMitla</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Volver
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-t-3xl min-h-screen px-4 py-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">🚕</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin
              ? 'Accede a tu panel de conductor'
              : 'Regístrate para comenzar a trabajar'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Número de Unidad</label>
                <input
                  type="text"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  placeholder="Ej: M-001"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 9511234567"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              loading
                ? 'bg-gray-300 text-gray-500'
                : 'bg-primary-500 text-white active:bg-primary-600'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Procesando...
              </span>
            ) : isLogin ? (
              '🚀 Iniciar Sesión'
            ) : (
              '✅ Crear Cuenta'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-primary-500 font-medium"
          >
            {isLogin
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-800 mb-2">🏆 Sistema de Badges</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2 text-xs">🌱</span>
              <span className="text-gray-600">Principiante: 0-19 viajes</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2 text-xs">⭐</span>
              <span className="text-gray-600">Regular: 20-49 viajes</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-2 text-xs">🔥</span>
              <span className="text-gray-600">Experto: 50-99 viajes</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2 text-xs">👑</span>
              <span className="text-gray-600">ÉLITE: 100+ viajes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
