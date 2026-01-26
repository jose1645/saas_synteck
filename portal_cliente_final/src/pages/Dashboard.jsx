import { useEffect, useState } from 'react';
import { LayoutDashboard, Factory, Cpu, AlertTriangle, Zap } from 'lucide-react';
import api from '../services/api';
import { useBranding } from '../context/BrandingContext';

export default function FleetDashboard() {
  const [stats, setStats] = useState({ total_plants: 0, active_devices: 0, alerts: 0 });
  const { branding } = useBranding();

  useEffect(() => {
    // Cargar estadísticas globales del cliente
    api.get('/stats/summary').then(res => setStats(res.data));
  }, []);

  return (
    <div className="p-8 bg-brand-primary min-h-screen text-brand-textPrimary transition-colors duration-300">
      <header className="mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Resumen de <span className="text-brand-accent">Flota</span></h1>
        <p className="text-brand-textSecondary text-xs font-bold uppercase tracking-[0.3em]">{branding.name || 'IoT Platform'} OS v2.0</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard icon={<Factory className="text-brand-accent" />} label="Plantas Activas" value={stats.total_plants} />
        <StatCard icon={<Cpu className="text-brand-accentSec" />} label="Nodos en Línea" value={stats.active_devices} />
        <StatCard icon={<AlertTriangle className="text-amber-400" />} label="Alertas Críticas" value={stats.alerts} />
      </div>

      <section className="bg-brand-secondary border border-brand-border rounded-[2.5rem] p-8 shadow-md">
        <h2 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-brand-textPrimary">
          <Zap size={18} className="text-brand-accent" /> Rendimiento Energético Global
        </h2>
        <div className="h-64 flex items-center justify-center border border-dashed border-brand-border rounded-3xl text-brand-textSecondary uppercase text-[10px] font-black hover:bg-brand-sidebar/50 transition-colors">
          Gráfica de consumo acumulado (Próximamente)
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-brand-secondary border border-brand-border p-8 rounded-[2rem] flex items-center gap-6 shadow-sm hover:border-brand-accent/50 transition-all">
      <div className="p-4 bg-brand-sidebar rounded-2xl border border-brand-border">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-brand-textPrimary">{value}</p>
      </div>
    </div>
  );
}