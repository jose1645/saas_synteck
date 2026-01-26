import React from 'react';
import { 
  Users, 
  Cpu, // Cambiamos HardDrive por Cpu que es más genérico para dispositivos
  AlertTriangle, 
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign,
  Wallet,
  Globe
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-slate-800">{value}</h3>
        {trend && (
          <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> {trend} este mes
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const PartnerDashboard = () => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel Operativo y Financiero</h1>
          <p className="text-slate-500">Gestión de activos industriales y rendimiento de red</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter text-nowrap">Suscripción Partner Pro Activa</span>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ingreso Recurrente (MRR)" 
          value="$2,450" 
          icon={DollarSign} 
          color="bg-emerald-50 text-emerald-600"
          trend="+15.2%" 
        />
        <StatCard 
          title="Clientes Totales" 
          value="12" 
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Dispositivos Online" 
          value="38/42" 
          icon={Cpu} 
          color="bg-indigo-50 text-indigo-600" 
        />
        <StatCard 
          title="Alertas de Red" 
          value="3" 
          icon={AlertTriangle} 
          color="bg-amber-50 text-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECCIÓN: Rentabilidad por Planta */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="text-slate-400" size={20} />
              <h3 className="font-bold text-slate-800">Rentabilidad por Planta</h3>
            </div>
            <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
              Ver detalles <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4 font-bold">Planta / Cliente</th>
                  <th className="pb-4 font-bold text-center">Dispositivos</th>
                  <th className="pb-4 font-bold text-right">Ingreso Mensual</th>
                  <th className="pb-4 font-bold text-right">Margen Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'Panificadora Central', devices: 8, revenue: 800, margin: 640 },
                  { name: 'Textiles del Norte', devices: 4, revenue: 400, margin: 320 },
                  { name: 'Aceros Industriales', devices: 12, revenue: 1200, margin: 960 },
                  { name: 'Lácteos del Valle', devices: 2, revenue: 200, margin: 160 },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <p className="text-sm font-bold text-slate-700">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Contrato Activo</p>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        {item.devices} unid.
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <p className="text-sm font-bold text-slate-800">${item.revenue} USD</p>
                    </td>
                    <td className="py-4 text-right">
                      <p className="text-sm font-black text-emerald-600">${item.margin} USD</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN: Estado Técnico (Infraestructura) */}
        <div className="space-y-8">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
            <h3 className="font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest opacity-80">
              <Globe size={16} className="text-blue-400" />
              Nube Synteck IoT
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] mb-2 font-bold uppercase opacity-50">
                  <span>Tráfico de Datos (Cloud)</span>
                  <span>65%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[65%]" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-xs font-medium">Gateway Central Operativo</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle size={18} className="text-amber-500" />
              Incidentes de Dispositivos
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-bold text-red-700">Nodo Desconectado</p>
                <p className="text-[10px] text-red-500 uppercase font-medium">DEV-01 (Panificadora Central)</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700">Latencia en Reporte</p>
                <p className="text-[10px] text-amber-500 uppercase font-medium">DEV-09 (Textiles Norte)</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PartnerDashboard;