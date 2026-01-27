import { useEffect, useState } from 'react';
import { LayoutDashboard, Factory, Cpu, AlertTriangle, Zap, CheckCircle2, History } from 'lucide-react';
import api from '../services/api';
import { useBranding } from '../context/BrandingContext';

export default function FleetDashboard() {
  const [stats, setStats] = useState({
    partners_count: 0,
    clients_count: 0,
    devices_online: 0,
    recent_devices: []
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { branding } = useBranding();

  const loadDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/stats/summary'),
        api.get('/alerts/active')
      ]);
      setStats(statsRes.data);
      setActiveAlerts(alertsRes.data);
    } catch (err) {
      console.error("📊 Error al cargar datos del Dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
    // Refresco automático cada 30s
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 bg-brand-primary min-h-screen text-brand-textPrimary transition-colors duration-300">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
            Inteligencia <span className="text-brand-accent">Operativa</span>
            <div className="h-1 w-12 bg-brand-accent rounded-full" />
          </h1>
          <p className="text-brand-textSecondary text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mt-2">
            {branding.name || 'Synteck'} OS V2.0 // INDUSTRIAL INTELLIGENCE
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-secondary border border-brand-border rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sistema en Línea</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <StatCard
          icon={<Factory size={24} className="text-brand-accent" />}
          label="Sectores / Plantas"
          value={stats.clients_count || stats.total_plants || 1}
          trend="+0%"
          color="cyan"
        />
        <StatCard
          icon={<Cpu size={24} className="text-brand-accentSec" />}
          label="Nodos Activos"
          value={stats.devices_online || 0}
          trend="Live"
          color="purple"
        />
        <StatCard
          icon={<AlertTriangle size={24} className={activeAlerts.some(a => a.severity === 'CRITICAL') ? "text-red-500 animate-pulse" : "text-amber-400"} />}
          label="Alertas Activas"
          value={activeAlerts.length}
          trend={activeAlerts.length > 0 ? "Atención" : "Estable"}
          color="amber"
        />
      </div>

      {/* ALERT MONITOR SECTION */}
      {activeAlerts.length > 0 && (
        <section className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-red-500">
            <div className="w-1.5 h-6 bg-red-500 rounded-full animate-pulse" />
            Monitor de Anomalías en Tiempo Real
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeAlerts.map(alert => (
              <div key={alert.id} className={`p-6 bg-brand-secondary border rounded-[2rem] shadow-xl transition-all hover:scale-[1.02] ${alert.severity === 'CRITICAL' ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/30'}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-amber-500 text-brand-primary'}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[9px] font-mono text-brand-textSecondary">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase mb-2 leading-tight">{alert.title}</h3>

                {/* DELTA DE TIEMPO (DURACIÓN DE LA ANOMALÍA) */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <History size={12} className="text-brand-accent animate-spin-slow" />
                    <span className="text-[10px] font-black font-mono text-brand-accent">
                      {(() => {
                        const start = new Date(alert.breach_started_at || alert.created_at);
                        const diff = Math.floor((new Date() - start) / 1000);
                        const mins = Math.floor(diff / 60);
                        const secs = diff % 60;
                        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                      })()}
                    </span>
                  </div>
                  <span className="text-[8px] font-bold uppercase text-brand-textSecondary opacity-40 tracking-widest">Fuera de Rango</span>
                </div>

                <p className="text-[10px] text-brand-textSecondary mb-6 line-clamp-2">{alert.message}</p>

                <div className="flex items-center justify-between border-t border-brand-border/50 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold uppercase text-brand-textSecondary opacity-50">Valor</span>
                    <span className="text-lg font-black text-brand-accent">{alert.value_detected} <span className="text-[10px] opacity-40">limit: {alert.limit_value}</span></span>
                  </div>
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        api.post('/alerts/ack', { alert_id: alert.id })
                          .then(() => loadDashboardData());
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-primary border border-brand-border rounded-xl text-[9px] font-black uppercase hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50 transition-all group"
                    >
                      <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                      Reconocer
                    </button>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <div className="flex items-center gap-2 text-emerald-500 opacity-60">
                      <CheckCircle2 size={16} />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Enterado</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RECENT DEVICES */}
        <section className="bg-brand-secondary border border-brand-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <History size={120} />
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-brand-textPrimary">
            <div className="w-1.5 h-6 bg-brand-accent rounded-full" />
            Últimos Nodos Registrados
          </h2>

          <div className="space-y-4">
            {stats.recent_devices?.length > 0 ? stats.recent_devices.map(device => (
              <div key={device.id} className="flex items-center justify-between p-4 bg-brand-primary/40 rounded-2xl border border-brand-border/50 hover:border-brand-accent/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-sidebar rounded-xl border border-brand-border">
                    <Cpu size={16} className="text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight">{device.name}</p>
                    <p className="text-[9px] font-mono text-brand-textSecondary">{device.protocol || 'N/A'} • {new Date(device.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase">Online</span>
                </div>
              </div>
            )) : (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-brand-border/20 rounded-3xl">
                <p className="text-[10px] text-brand-textSecondary uppercase font-bold italic">Esperando telemetría...</p>
              </div>
            )}
          </div>
        </section>

        {/* PERFORMANCE ANALYSIS */}
        <section className="bg-brand-secondary border border-brand-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <h2 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-brand-textPrimary">
            <Zap size={18} className="text-brand-accent" /> Rendimiento Global
          </h2>
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-brand-border/30 rounded-[2rem] text-brand-textSecondary group hover:bg-brand-sidebar/30 transition-all cursor-default overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Zap size={32} className="mb-4 opacity-20 group-hover:scale-125 group-hover:text-brand-accent transition-all duration-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Módulo de IA & Analítica</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-brand-accent mt-2 animate-pulse">(Próximamente)</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }) {
  const colorMap = {
    cyan: 'shadow-brand-accent/5 hover:border-brand-accent/40',
    purple: 'shadow-brand-accentSec/5 hover:border-brand-accentSec/40',
    amber: 'shadow-amber-500/5 hover:border-amber-500/40'
  };

  return (
    <div className={`bg-brand-secondary border border-brand-border p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl transition-all duration-500 group ${colorMap[color]}`}>
      <div className="flex items-center gap-6">
        <div className="p-5 bg-brand-sidebar rounded-[1.5rem] border border-brand-border group-hover:scale-110 transition-transform duration-500 shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-[0.2em] mb-1 opacity-70">{label}</p>
          <p className="text-4xl font-black text-brand-textPrimary tracking-tighter">{value}</p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}