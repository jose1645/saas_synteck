import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [clientData, setClientData] = useState(null); // <--- Información de la empresa
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * SEGUNDA CONSULTA: Obtener detalles de la entidad (Empresa)
   */
  const fetchEntityData = async (clientId) => {
    try {
      console.log(`🏢 [Auth] Consultando info de la empresa ID: ${clientId}...`);
      const response = await api.get(`/clients/${clientId}`);
      setClientData(response.data);
      console.log("✅ [Auth] Empresa cargada:", response.data.name);
    } catch (error) {
      console.error("❌ [Auth] Error al obtener detalles del cliente:", error);
      // Opcional: podrías poner un nombre por defecto si falla
      setClientData({ name: "Terminal Industrial" });
    }
  };

  // 1. Persistencia de sesión al cargar la App
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Restauramos el header inmediatamente
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          
          // DISPARAMOS SEGUNDA CONSULTA SI ES CLIENTE
          if (parsedUser.client_id) {
            await fetchEntityData(parsedUser.client_id);
          }
        } catch (e) {
          console.error("❌ [Auth] Error recuperando sesión:", e);
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 2. Login con validación de Portal y Carga de Empresa
  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      
      // Sincronizamos usuario
      setUser(data.user);
      
      // DISPARAMOS SEGUNDA CONSULTA SI EL LOGIN TRAE CLIENT_ID
      if (data.user.client_id) {
        await fetchEntityData(data.user.client_id);
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || 'Fallo en la conexión segura';
      throw new Error(message);
    }
  };

  // 3. Logout con limpieza de empresa
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("⚠️ [Auth] Logout síncrono fallido.");
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      delete api.defaults.headers.common['Authorization'];
      
      setUser(null);
      setClientData(null); // <--- Limpiamos la empresa
      navigate('/login', { replace: true });
    }
  };

  const hasPermission = (permCode) => {
    if (!user || !user.permissions) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permCode);
  };

  return (
    <AuthContext.Provider value={{ user, clientData, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};