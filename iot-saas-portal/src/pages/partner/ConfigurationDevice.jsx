import React, { useState, useEffect } from "react";
import { Cpu, Settings, Database, Filter, Loader2, RefreshCcw } from "lucide-react";
import DeviceDetailModal from "../../components/DeviceDetailModal";
import TagMappingScreen from "../../components/TagMappingScreen";
import { deviceService } from "../../services/deviceService"; 

export default function DevicesListScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [mappingDevice, setMappingDevice] = useState(null);

  const handleOpenDetail = (device) => {
    setSelectedDevice(device);
    setIsDetailOpen(true);
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceService.getAllDevices();
      const data = Array.isArray(response.data) ? response.data : response.data.devices || [];
      setDevices(data);
    } catch (err) {
      console.error("Error loading devices:", err);
      setError("No se pudo conectar con el servidor de dispositivos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const filteredDevices = devices.filter((device) => {
    const isProvisioned = !!device.thing_arn;
    const statusMatch = 
      statusFilter === "all" || 
      (statusFilter === "online" && isProvisioned) || 
      (statusFilter === "offline" && !isProvisioned);

    const clientName = device.plant?.client?.name || "Sin asignar";
    const clientMatch = clientFilter === "all" || clientName === clientFilter;

    return statusMatch && clientMatch;
  });

  const clientsList = ["all", ...new Set(devices.map((d) => d.plant?.client?.name).filter(Boolean))];

  if (mappingDevice) {
    return <TagMappingScreen device={mappingDevice} onBack={() => setMappingDevice(null)} />;
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-medium">Sincronizando dispositivos Edge...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-red-50 text-red-600 p-8 rounded-[32px] border border-red-100 max-w-md">
        <p className="font-bold mb-4">{error}</p>
        <button 
          onClick={loadDevices}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl mx-auto hover:bg-red-700 transition-all shadow-lg shadow-red-200"
        >
          <RefreshCcw size={18} /> Reintentar conexión
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Dispositivos Edge</h1>
            <p className="text-slate-500 text-sm font-medium">Administración de Gateways e Identidad Digital AWS</p>
          </div>
          <button 
            onClick={loadDevices} 
            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm active:scale-95"
            title="Refrescar lista"
          >
            <RefreshCcw size={20} />
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-5 flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mr-2">
            <Filter size={16} /> Filtros
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer bg-slate-50"
          >
            <option value="all">Todos los registros</option>
            <option value="online">Certificados Generados (Azul)</option>
            <option value="offline">Pendientes (Ámbar)</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer bg-slate-50"
          >
            {clientsList.map((client) => (
              <option key={client} value={client}>
                {client === "all" ? "Todos los clientes" : client}
              </option>
            ))}
          </select>

          <span className="ml-auto text-xs font-black text-slate-400 uppercase tracking-tighter">
            {filteredDevices.length} unidades encontradas
          </span>
        </div>

        {/* LISTADO DE TARJETAS */}
        <div className="grid grid-cols-1 gap-4">
          {filteredDevices.map((device) => (
            <div 
              key={device.id} 
              className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                
                {/* Info del Dispositivo */}
                <div className="flex items-center gap-5 w-full lg:w-1/3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${device.thing_arn ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    <Cpu size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 leading-tight">
                      {device.name}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                      {device.plant?.client?.name || 'Cliente N/A'} • {device.plant?.name || 'Planta N/A'}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${device.thing_arn ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-amber-500 animate-pulse'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${device.thing_arn ? 'text-blue-600' : 'text-amber-600'}`}>
                        {device.thing_arn ? 'Certificados Generados' : 'Pendiente de Aprovisionar'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="hidden md:flex items-center gap-10 px-10 border-x border-slate-50">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">ID DB</p>
                        <p className="text-sm font-bold text-slate-700">#{device.id}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Protocolo</p>
                        <p className="text-sm font-bold text-slate-700">{device.protocol || 'MQTT'}</p>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    disabled={!device.thing_arn}
                    onClick={() => setMappingDevice(device)}
                    className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 
                      ${device.thing_arn 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-70'}`}
                  >
                    <Database size={16} />
                    MAPEAR TAGS
                  </button>

                  <button
                    onClick={() => handleOpenDetail(device)}
                    className="flex-1 md:flex-none px-5 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-200/50"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredDevices.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron dispositivos</p>
            </div>
          )}
        </div>
      </div>

      <DeviceDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        device={selectedDevice}
        onRefresh={loadDevices}
      />
    </div>
  );
}