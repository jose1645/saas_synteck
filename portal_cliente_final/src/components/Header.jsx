import { useAuth } from '../context/AuthContext';
import { Bell, Search, User, LogOut, ChevronDown } from 'lucide-react';

export default function Header() {
  // Extraemos clientData del contexto
  const { user, clientData, logout } = useAuth();

  return (
    <header className="h-16 bg-brand-primary/80 backdrop-blur-md border-b border-brand-border sticky top-0 z-40 px-8 flex items-center justify-between">

      {/* 1. Barra de Búsqueda */}
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
        <input
          type="text"
          placeholder="BUSCAR NODO, CLIENTE O PLANTA..."
          className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2 pl-10 pr-4 text-[10px] font-mono text-brand-textPrimary placeholder:text-brand-textSecondary focus:outline-none focus:border-brand-accent/50 transition-all"
        />
      </div>

      {/* 2. Acciones Globales */}
      <div className="flex items-center gap-6">
        {/* Notificaciones */}
        <div className="relative group cursor-pointer">
          <Bell size={20} className="text-brand-textSecondary group-hover:text-brand-accent transition-colors" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-brand-primary"></span>
        </div>

        {/* 3. Perfil de Usuario y Empresa */}
        <div className="flex items-center gap-3 pl-6 border-l border-brand-border">
          <div className="text-right hidden sm:block">
            {/* NOMBRE DE LA EMPRESA (industral SA) */}
            <p className="text-[10px] font-black text-brand-accent uppercase leading-none mb-1 tracking-wider">
              {clientData ? clientData.name : 'Cargando Entidad...'}
            </p>
            {/* NOMBRE DEL USUARIO (Alvaro) */}
            <p className="text-[9px] font-mono text-brand-textSecondary uppercase tracking-tighter">
              Terminal: {user?.full_name}
            </p>
          </div>

          <div className="relative group">
            <button className="w-10 h-10 rounded-xl bg-brand-secondary border border-brand-border flex items-center justify-center hover:border-brand-accent transition-all overflow-hidden">
              <User size={20} className="text-brand-textSecondary" />
            </button>

            {/* Dropdown de Usuario */}
            <div className="absolute right-0 mt-2 w-56 bg-brand-secondary border border-brand-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
              <div className="px-4 py-3 mb-2 border-b border-brand-border/50">
                <p className="text-[8px] text-brand-textSecondary font-bold uppercase tracking-[0.2em]">Email de Acceso</p>
                <p className="text-[10px] text-brand-textPrimary font-mono truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg text-[10px] font-black uppercase transition-all"
              >
                <LogOut size={16} />
                Desconectar Terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}