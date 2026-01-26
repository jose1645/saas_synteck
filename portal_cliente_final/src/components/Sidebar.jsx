import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap, LayoutDashboard, Factory,
  Cpu, ShieldAlert, BarChart3, ChevronLeft, ChevronRight,
  ChevronDown, Dot, Loader2, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { plantService } from '../services/plantService';
import { useBranding } from '../context/BrandingContext';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlantsOpen, setIsPlantsOpen] = useState(true);
  const [plants, setPlants] = useState([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);

  const { user } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();

  useEffect(() => {
    const loadPlants = async () => {
      if (user?.client_id) {
        try {
          setIsLoadingPlants(true);
          const res = await plantService.getPlantsByClient(user.client_id);
          setPlants(res.data);
        } catch (err) {
          console.error("❌ Error en Sidebar:", err);
        } finally {
          setIsLoadingPlants(false);
        }
      }
    };
    loadPlants();
  }, [user?.client_id]);

  return (
    <aside className={`bg-brand-sidebar border-r border-brand-border flex flex-col h-screen sticky top-0 transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-20 bg-brand-accent text-brand-primary rounded-full p-1 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:brightness-110 transition-all">
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-6 mb-4 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.name} className="w-8 h-8 object-contain" />
        ) : (
          <Zap size={28} className="text-brand-accent fill-brand-accent/10 flex-shrink-0" />
        )}
        {!isCollapsed && <span className="font-black text-brand-textPrimary tracking-tighter text-xl uppercase truncate">{branding.name || 'SYNTECK'}</span>}
      </div>

      <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar">
        <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" collapsed={isCollapsed} active={location.pathname.startsWith('/dashboard')} />

        <div className="space-y-1">
          <button onClick={() => !isCollapsed && setIsPlantsOpen(!isPlantsOpen)} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${location.pathname.includes('/plants') ? 'text-brand-accent bg-brand-accent/5' : 'text-brand-textSecondary hover:bg-white/5'} ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <Factory size={20} />
              {!isCollapsed && <span>Plantas</span>}
            </div>
            {!isCollapsed && <ChevronDown size={14} className={isPlantsOpen ? 'rotate-180' : ''} />}
          </button>

          {!isCollapsed && isPlantsOpen && (
            <div className="ml-6 pl-2 border-l border-brand-border space-y-1">
              {isLoadingPlants ? (
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-slate-600 italic"><Loader2 size={12} className="animate-spin" /></div>
              ) : (
                plants.map(plant => (
                  <Link key={plant.id} to={`/plants/${plant.id}`} className={`flex items-center gap-2 py-2 px-3 text-[10px] font-bold uppercase rounded-lg transition-all ${location.pathname === `/plants/${plant.id}` ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-textSecondary hover:text-brand-textPrimary'}`}>
                    <Dot size={16} className={location.pathname === `/plants/${plant.id}` ? 'text-brand-accent animate-pulse' : 'text-brand-textSecondary'} />
                    <span className="truncate">{plant.name}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <SidebarLink to="/fleet" icon={<Cpu size={20} />} label="Dispositivos" collapsed={isCollapsed} active={location.pathname === '/fleet'} />
        <SidebarLink to="/reports" icon={<BarChart3 size={20} />} label="Reportes" collapsed={isCollapsed} active={location.pathname === '/reports'} />
        <SidebarLink to="/settings" icon={<Settings size={20} />} label="Configuración" collapsed={isCollapsed} active={location.pathname === '/settings'} />
      </nav>

      <div className="p-4 border-t border-brand-border/50">
        <SidebarLink to="/admin" icon={<ShieldAlert size={18} />} label="Admin Terminal" collapsed={isCollapsed} active={location.pathname === '/admin'} isSpecial />
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label, collapsed, active, isSpecial = false }) {
  return (
    <Link to={to} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${active ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : isSpecial ? 'text-purple-400 hover:bg-purple-500/10' : 'text-brand-textSecondary hover:text-brand-textPrimary'} ${collapsed ? 'justify-center' : ''}`}>
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}