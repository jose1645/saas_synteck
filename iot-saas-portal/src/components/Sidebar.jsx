import React from 'react';
import { authService } from '../services/authService'; // Ajusta la ruta
import { 
  LayoutDashboard, 
  Users, 
  HardDrive, 
  Settings, 
  LogOut, 
  Activity,
  ChevronRight,
  Calculator, // Cambié EarIcon por Calculator que queda mejor para "Cotización"
  Layout
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/partner' },
    { icon: Users, label: 'Mis Clientes', path: '/partner/clients' },
    { icon: HardDrive, label: 'Configurar Dispositivo', path: '/partner/provisioning' },
    { icon: Layout, label: 'Tableros', path: '/partner/dashboardconfigscreen' },
    { icon: Calculator, label: 'Cotización', path: '/partner/quoter' },
    { icon: Settings, label: 'Ajustes', path: '/partner/settings' },
  ];

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col text-slate-300 border-r border-slate-800">
      {/* Header del Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-none">Synteck</h2>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">IoT Platform</span>
          </div>
        </div>
      </div>

      {/* Perfil de Usuario Rápido */}
      <div className="px-6 py-4 mb-4 bg-slate-800/40 mx-4 rounded-2xl border border-slate-700/50">
        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1">Integrador</p>
        {/* Mostramos el nombre completo si existe, si no, el email */}
        <p className="text-sm font-bold text-slate-100 truncate">
          {user?.full_name || user?.email?.split('@')[0]}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon 
                  size={18} 
                  className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} 
                />
                <span className="font-semibold text-sm">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="opacity-50" />}
            </button>
          );
        })}
      </nav>

      {/* Botón de Salida */}
      <div className="p-4 mt-auto border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;