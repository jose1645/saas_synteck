import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";

import Dashboard from "./pages/Dashboard";
import Partners from "./pages/Partners";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import Devices from "./pages/Devices";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";

function ProtectedLayout({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;

  return (
    // d-flex activa flexbox, vh-100 asegura que ocupe todo el alto
    <div className="d-flex vh-100 overflow-hidden">
      {/* Sidebar fijo */}
      <Sidebar />

      {/* Contenedor derecho: Header arriba, Main abajo */}
      <div className="d-flex flex-column flex-grow-1 bg-light overflow-auto">
        <Header />
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rutas Protegidas envueltas en el nuevo Layout de Bootstrap */}
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/partners" element={<ProtectedLayout><Partners /></ProtectedLayout>} />
          <Route path="/clients" element={<ProtectedLayout><Clients /></ProtectedLayout>} />
          <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
          <Route path="/devices" element={<ProtectedLayout><Devices /></ProtectedLayout>} />
          
          {/* Redirección global */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}