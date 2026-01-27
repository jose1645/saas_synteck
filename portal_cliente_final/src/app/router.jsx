import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/auth/Login';
import AuthLayout from '../components/layout/AuthLayout';
import MainLayout from '../layout/MainLayout';
import Dashboard from '../pages/Dashboard';
import FleetView from '../components/layout/FleetView';
import AlertSettings from '../pages/AlertSettings';
import PlantDetail from '../pages/PlantDetail'; // Necesitarás crear esta vista

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin shadow-[0_0_15px_rgba(0,0,0,0.2)]"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
        />
      </Route>

      <Route element={user ? <MainLayout /> : <Navigate to="/login" replace />}>
        {/* Dashboard principal (vacío o selección) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Dashboard específico de un equipo (Aquí es donde llegará el deviceId) */}
        <Route path="/dashboard/:deviceId" element={<Dashboard />} />

        {/* Listado de equipos por Planta */}
        <Route path="/plants/:plantId" element={<PlantDetail />} />

        {/* Otras páginas habilitadas */}
        <Route path="/fleet" element={<FleetView />} />
        <Route path="/reports" element={<div className="p-8 text-brand-textPrimary">Centro de Reportes Analíticos</div>} />
        <Route path="/settings" element={<AlertSettings />} />
        <Route path="/admin" element={<div className="p-8 text-brand-textPrimary">Terminal de Administración Crítica</div>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}