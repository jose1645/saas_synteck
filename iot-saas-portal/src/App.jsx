import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';

// Componentes
import LoginPage from './pages/LoginPage.jsx';
import SetupPassword from './pages/partner/SetupPassword.jsx';
import Sidebar from './components/Sidebar.jsx';

// Páginas del Integrador
import PartnerDashboard from './pages/partner/PartnerDashboard.jsx';
import ClientsPage from './pages/partner/ClientsPage.jsx';
import ClientDetail from './pages/partner/ClientDetail.jsx';
import ConfigurationDevice from './pages/partner/ConfigurationDevice.jsx';
import SettingsPage from './pages/partner/Profile.jsx';
import DashboardConfigScreen from './pages/partner/DashboardConfigScreen.jsx';
import Quoter from './pages/partner/QuoterScreen.jsx';

function App() {
  // Inicializamos el estado desde el localStorage para persistencia
  const [user, setUser] = useState(() => authService.getCurrentUser());

  const handleLogin = (userData) => {
    setUser(userData); // Actualiza el estado global al loguear
  };

  const handleLogout = () => {
    authService.logout(); // Limpia localStorage y headers
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública para activar cuenta (Token de correo) */}
        <Route path="/setup-password" element={<SetupPassword />} />

        {!user ? (
          /* SI NO HAY USUARIO: Solo mostramos Login */
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        ) : (
          /* SI HAY USUARIO: Layout Protegido */
          <Route
            path="/*"
            element={
              <div className="flex min-h-screen bg-slate-50">
                <Sidebar user={user} onLogout={handleLogout} />
                
                <main className="flex-1 overflow-y-auto">
                  <Routes>
                    <Route path="/partner" element={<PartnerDashboard />} />
                    <Route path="/partner/clients" element={<ClientsPage />} />
                    <Route path="/partner/clients/:clientId" element={<ClientDetail />} />
                    <Route path="/partner/provisioning" element={<ConfigurationDevice />} />
                    <Route path="/partner/settings" element={<SettingsPage user={user} />} />
                    <Route path="/partner/dashboardconfigscreen" element={<DashboardConfigScreen />} />
                    <Route path="/partner/quoter" element={<Quoter />} />

                    {/* Redirección por defecto */}
                    <Route path="*" element={<Navigate to="/partner" />} />
                  </Routes>
                </main>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;