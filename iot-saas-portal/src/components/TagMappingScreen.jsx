import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Variable, Loader2, Radar, X, Edit3,
  Activity, ChevronRight, Database, FolderTree, ChevronDown,
  Settings2, ToggleLeft, CheckCircle2, Tag, Zap, Droplets,
  Gauge, Thermometer, CloudRain, Cpu, Box, HelpCircle
} from "lucide-react";
import { authService } from "../services/authService";
import { deviceService } from "../services/deviceService"; // Importamos el servicio

// --- CONSTANTES: CATEGORÍAS POR FENÓMENO FÍSICO ---
const PHENOMENA_CATEGORIES = [
  {
    id: 'electricity',
    label: 'Electricidad',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    units: ['KwH', 'V', 'A', 'W', 'PF', 'Hz']
  },
  {
    id: 'fluids',
    label: 'Fluidos',
    icon: Droplets,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    units: ['m³/h', 'L/min', 'm³', 'L']
  },
  {
    id: 'pressure',
    label: 'Presión',
    icon: Gauge,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    units: ['PSI', 'Bar', 'Pa', 'kPa']
  },
  {
    id: 'temp',
    label: 'Temperatura',
    icon: Thermometer,
    color: 'text-red-500',
    bg: 'bg-red-50',
    units: ['°C', '°F', 'K']
  },
  {
    id: 'humidity',
    label: 'Humedad',
    icon: CloudRain,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    units: ['% HR']
  },
  {
    id: 'mechanics',
    label: 'Mecánica',
    icon: Cpu,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    units: ['RPM', 'Hz', 'm/s²']
  },
  {
    id: 'others',
    label: 'Otros',
    icon: Box,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    units: ['%', 'ppm', 'count', 'unit']
  }
];

// --- UTILIDAD: CONSTRUYE EL ÁRBOL Y APLICA PODA RECURSIVA ---
const buildTree = (flatTree, registeredTags) => {
  const tree = {};
  // Normalizamos el set para comparación exacta
  const mappedSet = new Set(registeredTags.map(t => `${t.path}/${t.mqtt_key}`));

  Object.entries(flatTree).forEach(([path, sensors]) => {
    const parts = path === "root" ? ["root"] : path.split("/");
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = { children: {}, sensors: {} };
      }
      if (index === parts.length - 1) {
        const filteredSensors = {};
        Object.entries(sensors).forEach(([key, val]) => {
          if (!mappedSet.has(`${path}/${key}`)) {
            filteredSensors[key] = val;
          }
        });
        current[part].sensors = filteredSensors;
      }
      current = current[part].children;
    });
  });

  const prune = (node) => {
    const keys = Object.keys(node);
    keys.forEach(key => {
      const child = node[key];
      prune(child.children);
      const hasSensors = Object.keys(child.sensors).length > 0;
      const hasActiveChildren = Object.keys(child.children).length > 0;
      if (!hasSensors && !hasActiveChildren) {
        delete node[key];
      }
    });
  };

  prune(tree);
  return tree;
};

// --- COMPONENTE RECURSIVO DE NODO ---
const TreeNode = ({ name, node, level = 0, onMap, fullPath }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = Object.keys(node.children).length > 0;
  const hasSensors = Object.keys(node.sensors).length > 0;

  if (!hasSensors && !hasChildren) return null;

  return (
    <div className="select-none animate-in fade-in zoom-in-95 duration-300">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 py-3 px-4 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 ${level === 0 ? 'bg-slate-800/30 mb-1 border border-slate-800' : 'mb-1'
          }`}
        style={{ marginLeft: `${level * 12}px` }}
      >
        {hasChildren ? (
          <ChevronDown size={14} className={`transition-transform duration-300 ${!isOpen ? '-rotate-90' : ''} text-blue-400`} />
        ) : (
          <div className="w-[14px]" />
        )}
        <FolderTree size={16} className={level === 0 ? "text-blue-500" : "text-slate-500"} />
        <span className={`text-[11px] font-black uppercase tracking-widest ${level === 0 ? 'text-blue-100' : 'text-slate-400'}`}>
          {name === "root" ? "Principal" : name}
        </span>
      </div>

      {isOpen && (
        <>
          {hasSensors && (
            <div className="space-y-2 mt-1 mb-3">
              {Object.entries(node.sensors).map(([key, val]) => (
                <div
                  key={key}
                  className="flex justify-between items-center p-4 bg-slate-900/40 rounded-[22px] border border-slate-800/50 group hover:border-blue-500/30"
                  style={{ marginLeft: `${(level + 1) * 24}px` }}
                >
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{key}</p>
                    <p className="text-base font-black text-white font-mono leading-none tracking-tighter">
                      {typeof val === 'number' ? val.toFixed(2) : String(val)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMap(key, fullPath, val); }}
                    className="bg-blue-600 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                  >
                    <Activity size={14} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {Object.entries(node.children).map(([childName, childNode]) => (
            <TreeNode key={childName} name={childName} node={childNode} level={level + 1} onMap={onMap} fullPath={`${fullPath}/${childName}`} />
          ))}
        </>
      )}
    </div>
  );
};

export default function TagMappingScreen({ onBack, device }) {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [detectedTree, setDetectedTree] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    fetchRegisteredTags();
    return () => { if (socketRef.current) socketRef.current.close(1000); };
  }, [device]);

  const fetchRegisteredTags = async () => {
    setIsLoading(true);
    try {
      // Cargamos tags reales desde el servicio
      const res = await deviceService.getDeviceTags(device.id);
      setTags(res.data);
    } catch (err) {
      console.error("Error al cargar tags:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${tag.display_name || tag.mqtt_key}"?`)) return;

    try {
      const res = await deviceService.deleteTag(device.id, tag.mqtt_key, tag.path);
      if (res.status === 200) {
        // 1. Lo quitamos de la tabla (UI)
        setTags(prev => prev.filter(t => !(t.mqtt_key === tag.mqtt_key && t.path === tag.path)));
        // 2. Automáticamente el buildTree lo volverá a mostrar en "Pendientes"
        console.log("✅ Variable devuelta a pendientes");
      }
    } catch (err) {
      alert("No se pudo eliminar la variable.");
    }
  };

  const handleStartScan = () => {
    setIsScanning(true);
    const currentUser = authService.getCurrentUser();
    const getWsBaseUrl = () => {
      if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const protocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `${protocol}://${host}/monitor/ws`;
    };
    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/${currentUser?.partner_id}/${device?.client_id}/${device?.plant_id}/${device?.aws_iot_uid}`;
    socketRef.current = new WebSocket(wsUrl);
    socketRef.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { telemetry, metadata } = payload;
        const branch = metadata.subtopic || "root";
        setDetectedTree(prev => ({ ...prev, [branch]: { ...prev[branch], ...telemetry } }));
      } catch (e) { console.error("Error payload:", e); }
    };
  };

  const stopScan = () => {
    if (socketRef.current) socketRef.current.close(1000);
    setIsScanning(false);
  };

  const handleMapAction = (key, path, val) => {
    const isBool = typeof val === 'boolean' || val === 0 || val === 1;
    setEditingTag({
      name: key, path: path, display_name: "",
      type: isBool ? 'boolean' : 'numeric', unit: "",
      min: "", max: "", label_0: "OFF", label_1: "ON",
      hysteresis: 0, alert_delay: 0
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async (formData) => {
    setIsLoading(true);
    try {
      // Estructuramos el payload JSON para el Backend
      const payload = {
        device_uid: device?.aws_iot_uid,
        path: formData.path,
        mqtt_key: formData.name,
        display_name: formData.display_name || formData.name,
        data_type: formData.type,
        unit: formData.unit || null,
        min_value: formData.min !== "" ? parseFloat(formData.min) : null,
        max_value: formData.max !== "" ? parseFloat(formData.max) : null,
        label_0: formData.type === 'boolean' ? formData.label_0 : null,
        label_1: formData.type === 'boolean' ? formData.label_1 : null,
        hysteresis: formData.hysteresis !== "" ? parseFloat(formData.hysteresis) : 0,
        alert_delay: formData.alert_delay !== "" ? parseInt(formData.alert_delay) : 0
      };

      const res = await deviceService.registerTag(payload);

      if (res.status === 200 || res.status === 201) {
        // Actualizamos localmente para limpiar el árbol y llenar la tabla
        setTags(prev => {
          // Si ya existía por mqtt_key y path, lo reemplazamos (Upsert visual)
          const filtered = prev.filter(t => !(t.path === payload.path && t.mqtt_key === payload.mqtt_key));
          return [...filtered, res.data];
        });
        setIsDrawerOpen(false);
      }
    } catch (err) {
      console.error("Error persistiendo tag:", err);
      alert("Error al guardar en base de datos.");
    } finally {
      setIsLoading(false);
    }
  };

  const treeData = buildTree(detectedTree, tags);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">Mapeo de Activos</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              UID: {device?.aws_iot_uid}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={isScanning ? stopScan : handleStartScan} className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${isScanning ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {isScanning ? <X size={16} /> : <Radar size={16} />} {isScanning ? "Ocultar Monitor" : "Escanear en Vivo"}
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* BASE DE DATOS (IZQUIERDA) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[35px] shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Database size={14} /> Variables en Synteck Cloud ({tags.length})</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/30 text-slate-400 text-[9px] uppercase font-black tracking-widest sticky top-0 bg-white">
                  <tr><th className="p-5">Rama</th><th className="p-5">Alias / Key MQTT</th><th className="p-5">Tipo</th><th className="p-5 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tags.length === 0 ? (
                    <tr><td colSpan="4" className="p-10 text-center text-slate-300 font-bold italic">Sin variables registradas aún</td></tr>
                  ) : (
                    tags.map((tag) => (
                      <tr key={`${tag.path}/${tag.mqtt_key}`} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5"><span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">{tag.path}</span></td>
                        <td className="p-5">
                          <p className="font-black text-slate-700 leading-none mb-1">{tag.display_name}</p>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">{tag.mqtt_key}</p>
                        </td>
                        <td className="p-5 font-bold text-blue-500 uppercase text-[10px]">{tag.data_type}</td>
                        <td className="p-5 text-right"><button onClick={() => { setEditingTag({ ...tag, name: tag.mqtt_key, type: tag.data_type, min: tag.min_value, max: tag.max_value, hysteresis: tag.hysteresis, alert_delay: tag.alert_delay }); setIsDrawerOpen(true); }} className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={16} /></button></td>

                        <td className="p-5 text-right flex justify-end gap-2">
                          <button
                            onClick={() => { setEditingTag({ ...tag, name: tag.mqtt_key, type: tag.data_type }); setIsDrawerOpen(true); }}
                            className="text-slate-300 hover:text-blue-600 transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-slate-300 hover:text-red-500 transition-all"
                          >
                            <X size={16} /> {/* O usa el icono Trash2 de lucide */}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PENDIENTES (DERECHA) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 px-2"><FolderTree size={16} /> Pendientes por Mapear</h3>
          <div className="bg-slate-900 rounded-[40px] p-6 shadow-2xl border border-slate-800 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {Object.keys(treeData).length > 0 ? (
              Object.entries(treeData).map(([name, node]) => (
                <TreeNode key={name} name={name} node={node} onMap={handleMapAction} fullPath={name} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                {isScanning ? <CheckCircle2 size={48} className="text-green-500/20 mb-4" /> : <Radar size={48} className="mb-4 opacity-10 animate-pulse" />}
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center px-8">
                  {isScanning ? "¡Misión cumplida! Todas las variables detectadas han sido mapeadas" : "Inicia el scanner para detectar activos"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TagFormDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} initialData={editingTag} onSave={handleSave} isLoading={isLoading} />
    </div>
  );
}

function TagFormDrawer({ isOpen, onClose, initialData, onSave, isLoading }) {
  const [form, setForm] = useState({ name: "", display_name: "", unit: "", path: "", type: "numeric", min: "", max: "", label_0: "OFF", label_1: "ON" });
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || { name: "", display_name: "", unit: "", path: "", type: "numeric", min: "", max: "", label_0: "OFF", label_1: "ON", hysteresis: 0, alert_delay: 0 });

      // Auto-detectar categoría si ya tiene unidad
      if (initialData?.unit) {
        const cat = PHENOMENA_CATEGORIES.find(c => c.units.includes(initialData.unit));
        if (cat) setActiveCategory(cat.id);
      } else {
        setActiveCategory(null);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed top-4 right-4 bottom-4 w-[480px] bg-white rounded-[45px] shadow-2xl z-[80] flex flex-col border border-slate-100 animate-in slide-in-from-right duration-500 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Parametrización</h2>
            <p className="text-[10px] text-blue-600 font-black uppercase mt-1 bg-blue-50 inline-block px-3 py-1 rounded-full border border-blue-100 italic">Rama: {form.path}</p>
          </div>
          {isLoading && <Loader2 className="animate-spin text-blue-600" size={24} />}
        </div>

        <div className="p-8 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
          {/* TIPO DE VARIABLE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ToggleLeft size={12} /> Interpretación de Datos
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={isLoading}
                onClick={() => setForm({ ...form, type: 'numeric' })}
                className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-black text-[10px] uppercase transition-all ${form.type === 'numeric' ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              >
                <Activity size={20} />
                Numérica
              </button>
              <button
                disabled={isLoading}
                onClick={() => setForm({ ...form, type: 'boolean' })}
                className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-black text-[10px] uppercase transition-all ${form.type === 'boolean' ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              >
                <ToggleLeft size={20} />
                Booleana
              </button>
            </div>
          </div>

          {/* NOMBRE DE VISUALIZACIÓN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Tag size={12} /> Etiqueta en Dashboard
            </label>
            <input
              disabled={isLoading}
              type="text"
              className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all shadow-inner"
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
              placeholder="Ej. Consumo Total Máquina 1"
            />
          </div>

          {form.type === 'numeric' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {/* SELECTOR DE FENÓMENO FÍSICO */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Radar size={12} /> Fenómeno Físico & Unidad
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {PHENOMENA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setForm({ ...form, unit: cat.units[0] });
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${activeCategory === cat.id
                        ? `border-blue-600 ${cat.bg} scale-105 shadow-md`
                        : 'border-slate-50 hover:border-slate-200'
                        }`}
                    >
                      <cat.icon size={20} className={activeCategory === cat.id ? 'text-blue-600' : 'text-slate-400'} />
                      <span className={`text-[8px] font-black uppercase mt-1 tracking-tighter ${activeCategory === cat.id ? 'text-blue-700' : 'text-slate-400'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setActiveCategory('custom');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${activeCategory === 'custom'
                      ? 'border-blue-600 bg-blue-50 scale-105'
                      : 'border-slate-50 hover:border-slate-200'
                      }`}
                  >
                    <Settings2 size={20} className={activeCategory === 'custom' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`text-[8px] font-black uppercase mt-1 tracking-tighter ${activeCategory === 'custom' ? 'text-blue-700' : 'text-slate-400'}`}>
                      Custom
                    </span>
                  </button>
                </div>

                {/* UNIDADES SUGERIDAS */}
                {activeCategory && activeCategory !== 'custom' && (
                  <div className="p-4 bg-slate-50 rounded-[25px] border border-slate-100 flex flex-wrap gap-2 animate-in zoom-in-95 duration-200">
                    {PHENOMENA_CATEGORIES.find(c => c.id === activeCategory).units.map(u => (
                      <button
                        key={u}
                        onClick={() => setForm({ ...form, unit: u })}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${form.unit === u
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}

                {/* INPUT UNIT (CUSTOM O FINAL) */}
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                    <Database size={16} />
                  </div>
                  <input
                    disabled={isLoading}
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none shadow-inner"
                    value={form.unit}
                    onChange={e => {
                      setForm({ ...form, unit: e.target.value });
                      const cat = PHENOMENA_CATEGORIES.find(c => c.units.includes(e.target.value));
                      if (cat) setActiveCategory(cat.id);
                      else setActiveCategory('custom');
                    }}
                    placeholder="Unidad de medida..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Límite Mínimo</label>
                  <input disabled={isLoading} type="number" className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner" value={form.min} onChange={e => setForm({ ...form, min: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Límite Máximo</label>
                  <input disabled={isLoading} type="number" className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner" value={form.max} onChange={e => setForm({ ...form, max: e.target.value })} placeholder="100" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Settings2 size={12} /> Robustez de Alarma
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Histéresis (Banda Muerta)
                      <HelpCircle size={10} className="text-slate-300" title="Rango para que la alarma se desactive" />
                    </label>
                    <input
                      disabled={isLoading}
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner"
                      value={form.hysteresis}
                      onChange={e => setForm({ ...form, hysteresis: e.target.value })}
                      placeholder="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Retardo de Alerta (Seg)
                      <HelpCircle size={10} className="text-slate-300" title="Tiempo que debe persistir el error" />
                    </label>
                    <input
                      disabled={isLoading}
                      type="number"
                      className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner"
                      value={form.alert_delay}
                      onChange={e => setForm({ ...form, alert_delay: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">Estado para 0 (False)</label>
                  <input disabled={isLoading} type="text" className="w-full bg-slate-50 border-2 border-slate-50 focus:border-red-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner" value={form.label_0} onChange={e => setForm({ ...form, label_0: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-green-600 uppercase tracking-widest">Estado para 1 (True)</label>
                  <input disabled={isLoading} type="text" className="w-full bg-slate-50 border-2 border-slate-50 focus:border-green-500 rounded-2xl px-6 py-4 text-sm font-bold outline-none shadow-inner" value={form.label_1} onChange={e => setForm({ ...form, label_1: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 opacity-40">
            <div className="p-4 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
              <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2 mb-1"><Settings2 size={12} /> MQTT Hook (Backend)</p>
              <code className="text-[10px] font-mono font-bold text-slate-600">{form.name}</code>
            </div>
          </div>
        </div>

        <div className="p-8 border-t flex flex-col gap-4 bg-slate-50">
          <div className="flex gap-4">
            <button disabled={isLoading} onClick={onClose} className="flex-1 font-black text-[10px] uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            <button disabled={isLoading} onClick={() => onSave(form)} className="flex-[2] py-5 bg-blue-600 text-white rounded-[25px] font-black text-xs uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Vincular Variable
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
