import React, { useState, useMemo } from "react";
import { 
  Calculator, DollarSign, Check, X, 
  Save, FileDown, Eye, EyeOff, 
  Cpu, LayoutDashboard, BellRing, History, 
  Webhook, FileText, Activity, Database
} from "lucide-react";

export default function QuoterScreen() {
  
  // --- CONFIGURACIÓN DE PRECIOS BASE (TU MODELO DE NEGOCIO) ---
  const BASE_DEVICE_COST = 10; // Costo de conexión base
  const COST_PER_TAG = 0.25;   // Costo extra por cada variable monitoreada
  
  const MODULE_PRICES = {
    widgets: 0,
    alarms: 5,
    history: 10,
    api: 20,
    reports: 15,
  };

  const FREQUENCY_MULTIPLIERS = {
    "1 min": 1,
    "30 seg": 1.5,
    "10 seg": 2.5,
    "1 seg": 6, // Alta demanda de procesamiento en AWS
  };

  // --- ESTADOS ---
  const [deviceCount, setDeviceCount] = useState(5);
  const [tagCount, setTagCount] = useState(10);
  const [frequency, setFrequency] = useState("1 min");
  const [margin, setMargin] = useState(30); 
  const [showInternalCost, setShowInternalCost] = useState(true);

  const [features, setFeatures] = useState({
    widgets: true,
    alarms: true,
    history: true,
    api: false,
    reports: false,
  });

  // --- CÁLCULOS ---
  const totals = useMemo(() => {
    // 1. Costo de Módulos
    let featuresCost = 0;
    if (features.alarms) featuresCost += MODULE_PRICES.alarms;
    if (features.history) featuresCost += MODULE_PRICES.history;
    if (features.api) featuresCost += MODULE_PRICES.api;
    if (features.reports) featuresCost += MODULE_PRICES.reports;

    // 2. Costo por Carga de Datos (Tags * Frecuencia)
    const dataLoadCost = (tagCount * COST_PER_TAG) * FREQUENCY_MULTIPLIERS[frequency];

    // 3. Costo Total Unitario (Base + Features + Data)
    const costPerDevice = BASE_DEVICE_COST + featuresCost + dataLoadCost;

    // 4. Totales
    const totalPlatformCost = costPerDevice * deviceCount;
    const totalClientPrice = totalPlatformCost * (1 + margin / 100);
    const pricePerDeviceClient = totalClientPrice / deviceCount;

    return {
      costPerDevice,
      totalPlatformCost,
      pricePerDeviceClient,
      totalClientPrice,
      dataLoadCost
    };
  }, [deviceCount, margin, features, tagCount, frequency]);

  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 flex justify-center items-start">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === COLUMNA IZQUIERDA: CONFIGURADOR === */}
        <div className="lg:col-span-7 space-y-6">
          
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Calculator className="text-blue-600" size={32} />
              IoT Quoter Pro
            </h1>
            <p className="text-slate-500 font-medium">Configuración de arquitectura Multitenant</p>
          </div>

          {/* 1. Hardware y Escala */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Cpu size={16}/> Unidades HMI Delta
                </label>
                <span className="text-2xl font-black text-blue-600">{deviceCount}</span>
             </div>
             <input 
               type="range" min="1" max="100" value={deviceCount} 
               onChange={(e) => setDeviceCount(parseInt(e.target.value))}
               className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
          </div>

          {/* 2. Carga de Datos (Tags y Frecuencia) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Database size={16}/> Tags / Variables
                  </label>
                  <span className="font-bold text-slate-700">{tagCount}</span>
                </div>
                <input 
                  type="range" min="1" max="100" value={tagCount} 
                  onChange={(e) => setTagCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4 flex items-center gap-2">
                  <Activity size={16}/> Frecuencia de Muestreo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(FREQUENCY_MULTIPLIERS).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        frequency === f 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Módulos de Software */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FeatureCard 
                icon={<LayoutDashboard size={20}/>}
                title="Monitoreo Real-Time"
                desc="Dashboard web activo."
                price="Incluido"
                active={features.widgets}
                onClick={() => {}} 
                locked={true}
             />
             <FeatureCard 
                icon={<BellRing size={20}/>}
                title="Gestión de Alarmas"
                desc="Alertas vía Telegram/Mail."
                price={`+$${MODULE_PRICES.alarms}`}
                active={features.alarms}
                onClick={() => toggleFeature('alarms')}
             />
             <FeatureCard 
                icon={<History size={20}/>}
                title="Históricos Cloud"
                desc="Data log de 30 días."
                price={`+$${MODULE_PRICES.history}`}
                active={features.history}
                onClick={() => toggleFeature('history')}
             />
             <FeatureCard 
                icon={<FileText size={20}/>}
                title="Reportes Automatizados"
                desc="PDF mensual a correo."
                price={`+$${MODULE_PRICES.reports}`}
                active={features.reports}
                onClick={() => toggleFeature('reports')}
             />
             <FeatureCard 
                icon={<Webhook size={20}/>}
                title="API de Integración"
                desc="Conexión con ERP/SAP."
                price={`+$${MODULE_PRICES.api}`}
                active={features.api}
                onClick={() => toggleFeature('api')}
             />
          </div>

          {/* 4. Margen Comercial */}
          {showInternalCost && (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
               <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                      Margen de Reventa (Integrador)
                  </label>
                  <span className="text-2xl font-black text-green-400">{margin}%</span>
               </div>
               <input 
                 type="range" min="0" max="200" step="5" value={margin} 
                 onChange={(e) => setMargin(parseInt(e.target.value))}
                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
               />
            </div>
          )}
        </div>

        {/* === COLUMNA DERECHA: RESUMEN FINANCIERO === */}
        <div className="lg:col-span-5">
           <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 sticky top-8">
              
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presupuesto Estimado</span>
                 <button 
                   onClick={() => setShowInternalCost(!showInternalCost)}
                   className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                 >
                    {showInternalCost ? <Eye size={16}/> : <EyeOff size={16}/>}
                    {showInternalCost ? "Modo Integrador" : "Modo Cliente"}
                 </button>
              </div>

              <div className="p-8 space-y-8">
                 <div className="text-center space-y-2">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Inversión Mensual</p>
                    <div className="flex items-start justify-center text-slate-800">
                       <span className="text-3xl font-bold mt-2">$</span>
                       <span className="text-8xl font-black tracking-tighter">
                          {totals.totalClientPrice.toFixed(0)}
                       </span>
                    </div>
                    <p className="text-slate-400 font-medium italic">Suscripción SaaS Multitenant</p>
                 </div>

                 <div className="space-y-4 pt-6 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500">Costo por Dispositivo</span>
                       <span className="font-bold text-slate-800">${totals.pricePerDeviceClient.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500">Carga de Telemetría</span>
                       <span className="font-bold text-slate-800">{(tagCount * (60 / parseInt(frequency)) * 60 * 24).toLocaleString()} envíos/día</span>
                    </div>
                 </div>

                 {showInternalCost && (
                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 space-y-3">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Análisis de Utilidad</p>
                       <div className="flex justify-between text-xs">
                          <span className="text-blue-700 font-medium">Costo neto proveedor:</span>
                          <span className="font-bold text-blue-800">${totals.totalPlatformCost.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-blue-700 font-bold">Tu utilidad mensual:</span>
                          <span className="text-lg font-black text-green-600">
                             +${(totals.totalClientPrice - totals.totalPlatformCost).toFixed(2)}
                          </span>
                       </div>
                    </div>
                 )}

                 <div className="grid grid-cols-1 gap-3 pt-2">
                    <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                       <Save size={20}/> Guardar Configuración
                    </button>
                    <button className="w-full py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                       <FileDown size={20}/> Exportar para Cliente
                    </button>
                 </div>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, price, active, onClick, locked }) {
  return (
    <div 
      onClick={!locked ? onClick : undefined}
      className={`
        p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group select-none
        ${active 
            ? 'bg-white border-blue-400 shadow-md ring-1 ring-blue-400' 
            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
        }
      `}
    >
       <div className="flex items-center gap-3">
          <div className={`
             w-10 h-10 rounded-xl flex items-center justify-center transition-colors
             ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}
          `}>
             {icon}
          </div>
          <div>
             <h4 className={`font-bold text-sm ${active ? 'text-slate-900' : 'text-slate-500'}`}>{title}</h4>
             <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
          </div>
       </div>
       <div className="text-right">
          <span className={`text-xs font-black block ${active ? 'text-blue-600' : 'text-slate-400'}`}>{price}</span>
          {active && <Check size={14} className="text-blue-600 ml-auto mt-1"/>}
       </div>
    </div>
  );
}