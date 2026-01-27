import React, { useState, useEffect } from 'react';
import {
    BellRing, Settings2, ShieldAlert, Activity,
    Factory, Cpu, HelpCircle, Loader2, Search,
    Filter, ChevronRight, AlertCircle
} from 'lucide-react';
import { alertService } from '../services/alertService';

export default function AlertSettings() {
    const [configs, setConfigs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setIsLoading(true);
            const data = await alertService.getAlertConfig();
            setConfigs(data);
        } catch (err) {
            console.error("Error loading alert configs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredConfigs = configs.filter(config =>
        (config.display_name || config.mqtt_key).toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.plant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-brand-textPrimary tracking-tighter flex items-center gap-3">
                        <BellRing className="text-brand-accent" size={32} />
                        Configuración de Alertas
                    </h1>
                    <p className="text-brand-textSecondary text-sm font-medium mt-1">
                        Resumen de umbrales operativos y parámetros de robustez industrial.
                    </p>
                </div>

                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-textSecondary group-focus-within:text-brand-accent transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por equipo, planta o variable..."
                        className="w-full bg-brand-secondary border-2 border-brand-border focus:border-brand-accent rounded-2xl pl-12 pr-6 py-3 text-sm font-bold outline-none transition-all shadow-lg shadow-black/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatBox
                    icon={<ShieldAlert className="text-brand-accent" />}
                    label="Variables Protegidas"
                    value={configs.length}
                />
                <StatBox
                    icon={<Activity className="text-blue-500" />}
                    label="Monitoreo Activo"
                    value="100%"
                />
                <StatBox
                    icon={<Settings2 className="text-purple-500" />}
                    label="Parámetros Globales"
                    value="Auto"
                />
            </div>

            {/* Main Table Container */}
            <div className="bg-brand-secondary border border-brand-border rounded-[35px] shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-brand-border bg-brand-primary/30 flex justify-between items-center">
                    <h3 className="text-xs font-black text-brand-textSecondary uppercase tracking-widest flex items-center gap-2">
                        <Filter size={14} /> Registro de Umbrales Críticos
                    </h3>
                    <button
                        onClick={loadConfigs}
                        className="p-2 hover:bg-white/5 rounded-xl text-brand-textSecondary transition-all hover:rotate-180"
                    >
                        <Loader2 size={16} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-brand-primary/50 text-brand-textSecondary text-[10px] uppercase font-black tracking-widest border-b border-brand-border">
                            <tr>
                                <th className="p-6">Ubicación / Equipo</th>
                                <th className="p-6">Variable Monitorizada</th>
                                <th className="p-6">Rango Operativo</th>
                                <th className="p-6">Histeresis</th>
                                <th className="p-6">Retardo</th>
                                <th className="p-6 text-right">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <Loader2 className="animate-spin text-brand-accent mx-auto mb-4" size={40} />
                                        <p className="font-bold text-brand-textSecondary text-xs uppercase tracking-widest">Sincronizando con Servidores de Planta...</p>
                                    </td>
                                </tr>
                            ) : filteredConfigs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center text-brand-textSecondary italic font-bold opacity-30">
                                        No se encontraron configuraciones que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredConfigs.map((config) => (
                                    <tr key={config.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center border border-brand-accent/20 shrink-0">
                                                    <Factory size={18} className="text-brand-accent" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-brand-textPrimary leading-none mb-1 truncate text-xs">{config.plant_name}</p>
                                                    <p className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-tighter flex items-center gap-1">
                                                        <Cpu size={10} /> {config.device_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-brand-accent text-xs mb-1 uppercase tracking-tight">{config.display_name || config.mqtt_key}</span>
                                                <span className="text-[9px] font-mono font-bold text-brand-textSecondary uppercase opacity-50">{config.mqtt_key}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-brand-primary border border-brand-border rounded-lg">
                                                    <span className="text-[10px] font-black text-brand-textPrimary font-mono">
                                                        {config.min_value ?? '-∞'} <span className="text-brand-textSecondary font-sans">{config.unit}</span>
                                                    </span>
                                                </div>
                                                <ChevronRight size={14} className="text-brand-textSecondary" />
                                                <div className="px-3 py-1 bg-brand-primary border border-brand-border rounded-lg">
                                                    <span className="text-[10px] font-black text-brand-textPrimary font-mono">
                                                        {config.max_value ?? '+∞'} <span className="text-brand-textSecondary font-sans">{config.unit}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="inline-flex items-center px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[11px] font-black font-mono">
                                                ±{config.hysteresis}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="inline-flex items-center px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-[11px] font-black font-mono">
                                                {config.alert_delay}s
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">Activo</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Information Footer */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 px-4 opacity-70">
                <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                        <HelpCircle size={24} className="text-brand-textSecondary" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-brand-textPrimary uppercase mb-1">Nota Técnica: Histéresis</h4>
                        <p className="text-[11px] text-brand-textSecondary leading-relaxed">
                            La histéresis evita el parpadeo de alarmas causado por ruido en la señal. La alarma solo se desactivará cuando el valor regrese al rango normal superando esta banda muerta.
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                        <Activity size={24} className="text-brand-textSecondary" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-brand-textPrimary uppercase mb-1">Validación de Persistencia</h4>
                        <p className="text-[11px] text-brand-textSecondary leading-relaxed">
                            El tiempo de retardo garantiza que la anomalía sea persistente antes de notificar al personal, filtrando picos transitorios irrelevantes para la operación.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ icon, label, value }) {
    return (
        <div className="bg-brand-secondary border border-brand-border p-6 rounded-[30px] shadow-xl flex items-center gap-5 group hover:border-brand-accent/50 transition-all hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-primary border border-brand-border rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                {React.cloneElement(icon, { size: 28 })}
            </div>
            <div>
                <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-2xl font-black text-brand-textPrimary tracking-tighter leading-none">{value}</h4>
            </div>
        </div>
    );
}
