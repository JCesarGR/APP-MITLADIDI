import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import ConfirmacionPage from './pages/ConfirmacionPage';
import TrackingPage from './pages/TrackingPage';
import ChoferPage from './pages/ChoferPage';
import ChoferLoginPage from './pages/ChoferLoginPage';
// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminChoferesPage from './pages/admin/AdminChoferesPage';
import AdminViajesPage from './pages/admin/AdminViajesPage';
import AdminTarifasPage from './pages/admin/AdminTarifasPage';
import AdminReportesPage from './pages/admin/AdminReportesPage';

function AppRoutes() {
  const { choferId, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando TaxiMitla...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas de Pasajero */}
        <Route path="/" element={<HomePage />} />
        <Route path="/confirmacion/:viajeId" element={<ConfirmacionPage />} />
        <Route path="/tracking/:viajeId" element={<TrackingPage />} />

        {/* Rutas de Chofer */}
        <Route path="/chofer/login" element={<ChoferLoginPage />} />
        <Route path="/chofer" element={choferId ? <ChoferPage /> : <Navigate to="/chofer/login" />} />

        {/* Rutas de Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/viajes" element={<AdminViajesPage />} />
        <Route path="/admin/choferes" element={<AdminChoferesPage />} />
        <Route path="/admin/tarifas" element={<AdminTarifasPage />} />
        <Route path="/admin/reportes" element={<AdminReportesPage />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
