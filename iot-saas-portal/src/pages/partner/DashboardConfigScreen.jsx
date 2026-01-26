import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, BellRing, History,
  Webhook, FileText, Users, Mail, ArrowRight,
  Building2, ChevronDown, Briefcase, CheckCircle2,
  Loader2
} from "lucide-react";
import { clientService } from "../../services/clientService";
import { plantService } from "../../services/plantService";
import { deviceService } from "../../services/deviceService";

export default function PlantServicesScreen() {

  // --- ESTADOS DE DATOS ---
  const [clients, setClients] = useState([]);
  const [plants, setPlants] = useState([]);
  const [devices, setDevices] = useState([]); // Equipos de la planta seleccionada

  // --- ESTADOS DE SELECCIÓN ---
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);

  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [isPlantMenuOpen, setIsPlantMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- CARGA INICIAL: CLIENTES ---
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
      if (data.length > 0) {
        setSelectedClient(data[0]);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CARGA EN CASCADA: PLANTAS ---
  useEffect(() => {
    if (selectedClient) {
      loadPlants(selectedClient.id);
    } else {
      setPlants([]);
      setSelectedPlant(null);
    }
  }, [selectedClient]);

  const loadPlants = async (clientId) => {
    try {
      const res = await plantService.getPlantsByClient(clientId);
      setPlants(res.data);
      if (res.data.length > 0) {
        setSelectedPlant(res.data[0]);
      } else {
        setSelectedPlant(null);
      }
    } catch (error) {
      console.error("Error loading plants:", error);
    }
  };

  // --- CARGA EN CASCADA: DISPOSITIVOS Y ESTADO DE MÓDULOS ---
  useEffect(() => {
    if (selectedPlant) {
      loadDevices(selectedPlant.id);
    } else {
      setDevices([]);
    }
  }, [selectedPlant]);

  const loadDevices = async (plantId) => {
    try {
      const res = await plantService.getDevicesByPlant(plantId);
      const deviceList = res.data;
      setDevices(deviceList);

      // Sincronizar estado del toggle "History"
      // Si al menos un equipo tiene histórico activado, lo mostramos como activo
      const isHistoryActive = deviceList.some(d => d.history_enabled);
      updateModuleState('history', isHistoryActive);

    } catch (error) {
      console.error("Error loading devices:", error);
    }
  };

  // --- ESTADO DE MÓDULOS ---
  const [modules, setModules] = useState([
    {
      id: "widgets",
      title: "Widgets & Dashboard",
      desc: "Visualización en tiempo real específica para esta planta.",
      icon: <LayoutDashboard size={24} />,
      color: "text-purple-600 bg-purple-50",
      stats: "5 Activos",
      enabled: true
    },
    {
      id: "alarms",
      title: "Alarmas de Planta",
      desc: "Reglas de umbral para maquinaria local.",
      icon: <BellRing size={24} />,
      color: "text-red-600 bg-red-50",
      stats: "3 Reglas",
      enabled: true
    },
    {
      id: "history",
      title: "Históricos Locales",
      desc: "Retención de datos para auditorías de planta.",
      icon: <History size={24} />,
      color: "text-blue-600 bg-blue-50",
      stats: "Habilitado",
      enabled: false
    },
    {
      id: "api",
      title: "API Gateway (Edge)",
      desc: "Webhook para integración con ERP local.",
      icon: <Webhook size={24} />,
      color: "text-emerald-600 bg-emerald-50",
      stats: "Inactivo",
      enabled: false
    },
    {
      id: "reports",
      title: "Reportes de Turno",
      desc: "Resumen de producción por turno/día.",
      icon: <FileText size={24} />,
      color: "text-orange-600 bg-orange-50",
      stats: "0 Config",
      enabled: false
    },
    {
      id: "notifications",
      title: "Notificaciones",
      desc: "Alertas a jefes de turno y mantenimiento.",
      icon: <Mail size={24} />,
      color: "text-slate-600 bg-slate-100",
      stats: "Email",
      enabled: true
    },
  ]);

  const updateModuleState = (id, enabled) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
  };

  const toggleModule = async (id) => {
    // Optimistic Update
    const module = modules.find(m => m.id === id);
    if (!module) return;

    const newState = !module.enabled;
    updateModuleState(id, newState);

    // Lógica Específica por Módulo
    if (id === 'history') {
      if (!selectedClient) {
        alert("No hay un cliente seleccionado.");
        return;
      }

      try {
        // AHORA: Llamamos al endpoint centralizado de Módulos
        // El backend se encarga de propagarlo a los devices
        await clientService.updateModule(selectedClient.id, 'history', newState);

        console.log(`✅ Módulo Histórico actualizado para Cliente ${selectedClient.name}`);

        // Opcional: Recargar devices para ver que el flag cambió (si quisieras feedback visual inmediato)
        if (selectedPlant) {
          loadDevices(selectedPlant.id);
        }

      } catch (error) {
        console.error("Error updating module setting:", error);
        // Revertir si falla
        updateModuleState(id, !newState);
        alert("Error al actualizar la configuración en el servidor.");
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">

      {/* === HEADER PRINCIPAL === */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

          {/* AREA DE SELECTORES */}
          <div className="flex flex-col md:flex-row gap-6 md:items-center w-full md:w-auto">

            {/* 1. SELECTOR DE CLIENTE */}
            <div className="relative group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Organización</label>
              <button
                onClick={() => { setIsClientMenuOpen(!isClientMenuOpen); setIsPlantMenuOpen(false); }}
                className="flex items-center gap-3 text-2xl font-black text-slate-800 hover:text-blue-600 transition-colors"
                disabled={clients.length === 0}
              >
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                  <Briefcase size={24} />
                </div>
                {selectedClient ? selectedClient.name : "Sin Clientes"}
                <ChevronDown size={20} className={`text-slate-300 transition-transform ${isClientMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Clientes */}
              {isClientMenuOpen && clients.length > 0 && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-50">Seleccionar Cliente</div>
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => { setSelectedClient(client); setIsClientMenuOpen(false); }}
                      className={`w-full text-left px-4 py-4 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedClient?.id === client.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                    >
                      <Briefcase size={18} className={selectedClient?.id === client.id ? 'text-blue-600' : 'text-slate-400'} />
                      {client.name}
                      {selectedClient?.id === client.id && <span className="ml-auto text-blue-600 text-xs bg-white px-2 py-1 rounded-md border border-blue-200">Activo</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separador Visual */}
            <div className="hidden md:block w-px h-10 bg-slate-200 rotate-12 mx-2"></div>

            {/* 2. SELECTOR DE PLANTA */}
            <div className="relative group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Sucursal</label>
              <button
                onClick={() => { setIsPlantMenuOpen(!isPlantMenuOpen); setIsClientMenuOpen(false); }}
                className="flex items-center gap-3 text-xl font-bold text-slate-600 hover:text-slate-900 transition-colors"
                disabled={!selectedClient || plants.length === 0}
              >
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                  <Building2 size={20} />
                </div>
                {selectedPlant ? selectedPlant.name : (plants.length === 0 ? "Sin Plantas" : "Seleccionar")}
                <ChevronDown size={18} className={`text-slate-300 transition-transform ${isPlantMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Plantas */}
              {isPlantMenuOpen && plants.length > 0 && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-50">Plantas de {selectedClient?.name}</div>
                  {plants.map(plant => (
                    <button
                      key={plant.id}
                      onClick={() => { setSelectedPlant(plant); setIsPlantMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedPlant?.id === plant.id ? 'bg-slate-100 text-slate-800' : 'text-slate-600'}`}
                    >
                      <Building2 size={16} className={selectedPlant?.id === plant.id ? 'text-slate-600' : 'text-slate-400'} />
                      {plant.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STATUS GLOBAL (Movido a la derecha) */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold whitespace-nowrap">
            <CheckCircle2 size={16} />
            Sistema Online
          </div>
        </div>
      </div>

      {/* === CONTENIDO: GRID DE MÓDULOS === */}
      <div className="p-8 max-w-7xl mx-auto w-full flex-1">

        {!selectedPlant ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Building2 className="text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold">Selecciona un Cliente y una Planta para configurar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                className={`
                relative bg-white rounded-3xl p-6 border transition-all duration-300 group overflow-hidden
                ${module.enabled ? 'border-slate-200 shadow-sm hover:shadow-lg' : 'border-slate-100 opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100'}
              `}
              >
                {module.enabled && <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 ${module.color.split(" ")[1]}`}></div>}

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${module.color}`}>
                    {module.icon}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={module.enabled} onChange={() => toggleModule(module.id)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <h3 className="text-lg font-black text-slate-800 mb-1 relative z-10">{module.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 h-10 relative z-10">{module.desc}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${module.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{module.enabled ? module.stats : "Inactivo"}</span>
                  </div>

                  <button
                    disabled={!module.enabled}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:gap-2 transition-all disabled:text-slate-300 disabled:cursor-not-allowed"
                    onClick={() => console.log(`Configurando ${module.id}`)}
                  >
                    Configurar <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Card Upsell: Roles */}
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[220px] hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-500 mb-4 transition-colors">
                <Users size={24} />
              </div>
              <h3 className="font-bold text-slate-400 group-hover:text-blue-600">Roles de Planta</h3>
              <p className="text-xs text-slate-400 mt-1 px-4">Asigna permisos específicos a operarios.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}