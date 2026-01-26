import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Check, ChevronDown,
  ChevronRight, Layers, Wifi, WifiOff, ChevronLeft,
  History as HistoryIcon, Download
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { deviceService } from '../services/deviceService';
import { historyService } from '../services/historyService';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import TimeRangeSelector from '../components/TimeRangeSelector';

// Paleta Ciberpunk ampliada para Synteck OS
const CHART_COLORS = [
  '#00f2ff', '#7000ff', '#ff8c00', '#00ff8c',
  '#ff0055', '#fde047', '#0062ff', '#ff0000',
  '#00ffff', '#adff2f', '#ff00ff', '#ffa500'
];

export default function PlantDetail() {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const { user } = useAuth();
  const { branding } = useBranding();
  const socketRef = useRef(null);

  // New State for History
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState('live');
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  // 1. CARGA DE CONFIGURACIÓN Y ASIGNACIÓN DE COLORES
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setChartData([]); // Limpiar gráfica al cambiar de planta

        const devicesRes = await deviceService.getDevicesByPlant(plantId);
        const currentDevice = devicesRes.data[0];
        console.log("📱 [PlantDetail] Device Info:", currentDevice);
        console.log("🕰️ [PlantDetail] History Enabled:", currentDevice?.history_enabled);
        setDeviceInfo(currentDevice);
        setHistoryEnabled(currentDevice?.history_enabled || false);

        if (currentDevice) {
          const liveTagsRes = await dashboardService.getDeviceLiveTags(currentDevice.id);
          const allTags = liveTagsRes.data.map((tag, idx) => ({
            key: tag.mqtt_key,
            label: tag.display_name || tag.mqtt_key,
            path: tag.path || 'General',
            deviceUid: tag.device_uid,
            color: CHART_COLORS[idx % CHART_COLORS.length]
          }));

          setAvailableMetrics(allTags);
          if (allTags.length > 0) {
            setSelectedMetrics([allTags[0].key]);
            const firstRoot = allTags[0].path.split('/')[0];
            setExpandedNodes({ [firstRoot]: true });
          }
        }
      } catch (err) { console.error("❌ Error DB:", err); } finally { setLoading(false); }
    };
    if (plantId) loadData();
  }, [plantId]);

  // Handler para cambio de rango
  const handleRangeChange = (range) => {
    if (range === 'custom') {
      setTimeRange('custom');
      setIsLive(false);
      setConnected(false);
      setChartData([]);
      return;
    }

    setTimeRange(range);
    const newIsLive = range === 'live';
    setIsLive(newIsLive);
    setCustomStart(null);
    setCustomEnd(null);

    if (!newIsLive) {
      setConnected(false);
      loadHistory(range);
    } else {
      setChartData([]);
    }
  };

  const handleCustomRange = (start, end) => {
    setTimeRange('custom');
    setIsLive(false);
    setConnected(false);
    setCustomStart(start);
    setCustomEnd(end);
    loadHistory('custom', start, end);
  };

  const loadHistory = async (range, start = null, end = null) => {
    if (!deviceInfo) return;
    try {
      setIsHistoryLoading(true);
      setChartData([]);
      const data = await historyService.getHistory(deviceInfo.aws_iot_uid, range, start, end);
      console.log(`📊 [PlantDetail] Historia recibida (${range}): ${data.length} puntos`);
      setChartData(data);
    } catch (e) {
      console.error("Error loading history:", e);
      alert("Error cargando históricos.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!deviceInfo) return;
    try {
      await historyService.downloadHistory(
        deviceInfo.aws_iot_uid,
        timeRange,
        customStart,
        customEnd
      );
    } catch (error) {
      console.error("Download failed:", error);
      alert("Error descargando CSV.");
    }
  };

  // 2. CICLO DE VIDA DEL WEBSOCKET 
  useEffect(() => {
    if (loading || availableMetrics.length === 0 || !isLive) {
      if (!isLive && socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      console.log("🔌 Socket previo cerrado por cambio de contexto.");
    }

    const deviceUid = availableMetrics[0].deviceUid;
    const clientId = user?.client_id ?? 0;

    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/monitor/ws';
    const wsUrl = `${wsBase}/1/${clientId}/${plantId}/${deviceUid}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const incomingVals = data.telemetry;

        if (incomingVals) {
          setChartData(prev => {
            const newEntry = {
              time: new Date().toLocaleTimeString().slice(0, 8),
              ...incomingVals
            };
            const updated = [...prev, newEntry];
            return updated.length > 50 ? updated.slice(1) : updated;
          });
        }
      } catch (e) { console.error("❌ Error en stream:", e); }
    };

    socket.onclose = (event) => {
      setConnected(false);
      if (event.code === 1008) {
        console.error("🛑 CIERRE POR INTEGRIDAD: El equipo no coincide con la planta seleccionada.");
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [plantId, loading, availableMetrics.length, isLive]);

  // Generación dinámica del árbol ISA-95
  const treeData = useMemo(() => {
    const root = {};
    availableMetrics.forEach(metric => {
      const parts = metric.path.split('/');
      let current = root;
      parts.forEach(part => {
        if (!current[part]) current[part] = { _isNode: true, _metrics: [] };
        current = current[part];
      });
      current._metrics.push(metric);
    });
    return root;
  }, [availableMetrics]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex-1 bg-brand-primary p-8 flex gap-6 h-screen overflow-hidden text-brand-textPrimary transition-all duration-300">

      {/* SIDEBAR DINÁMICO */}
      <aside className={`border-r border-brand-border flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-r-0'}`}>
        <div className="flex items-center gap-3 mb-8 border-b border-brand-border pb-4 min-w-[200px]">
          <Layers size={18} className="text-brand-accent" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">Estructura Industrial</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-w-[200px]">
          <RecursiveTree
            data={treeData}
            toggleMetric={(key) => setSelectedMetrics(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key])}
            selectedMetrics={selectedMetrics}
            expandedNodes={expandedNodes}
            setExpandedNodes={setExpandedNodes}
            availableMetrics={availableMetrics}
          />
        </div>
      </aside>

      {/* ÁREA DE GRÁFICA */}
      <main className="flex-1 flex flex-col gap-6 overflow-hidden">
        <header className="flex justify-between items-center mb-4 bg-brand-secondary p-4 rounded-2xl border border-brand-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-xl border transition-all duration-300 ${isSidebarOpen ? 'bg-brand-accent/10 border-brand-accent text-brand-accent' : 'bg-brand-sidebar border-brand-border text-brand-textSecondary hover:text-brand-textPrimary'}`}
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Layers size={20} />}
            </button>

            <div className="flex items-center gap-4">
              {branding.logoUrl && (
                <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
              )}
              <div className="flex flex-col">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[10px] font-bold text-brand-textSecondary hover:text-brand-accent transition-all uppercase italic">
                  <ArrowLeft size={12} /> Dashboard
                </button>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-brand-textPrimary">
                  {branding.name ? branding.name : <><span className="text-brand-textPrimary">System</span> <span className="text-brand-accent">{plantId}</span></>}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* TOGGLE LIVE / HISTORICO */}
            <div className="flex items-center bg-brand-primary rounded-full p-1 border border-brand-border">
              <button
                onClick={() => handleRangeChange('live')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isLive ? 'bg-brand-accent text-black shadow-[0_0_15px_var(--accent-color)]' : 'text-brand-textSecondary hover:text-brand-textPrimary'}`}
              >
                <Wifi size={12} className={isLive ? "animate-pulse" : ""} /> Live
              </button>
              <button
                onClick={() => {
                  if (isLive) handleRangeChange('24h');
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!isLive ? 'bg-brand-accentSec text-white shadow-[0_0_15px_var(--accent-secondary)]' : 'text-brand-textSecondary hover:text-brand-textPrimary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={!historyEnabled}
                title={!historyEnabled ? "Historical data not enabled for this device" : "View historical trends"}
              >
                <Layers size={12} /> History
              </button>
            </div>

            {/* SELECTOR DE RANGO + DOWNLOAD */}
            {!isLive && historyEnabled && (
              <div className="flex items-center gap-3 animate-fade-in-right">
                <TimeRangeSelector
                  selectedRange={timeRange}
                  onRangeChange={handleRangeChange}
                  onCustomRangeChange={handleCustomRange}
                />

                <button
                  onClick={handleDownload}
                  className="p-2 bg-brand-secondary hover:bg-brand-accent hover:text-black text-brand-textSecondary rounded-lg transition-colors border border-brand-border"
                  title="Download CSV"
                >
                  <Download size={16} />
                </button>
              </div>
            )}

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${connected ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-red-500/30 bg-red-500/5 text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{connected ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-brand-secondary border border-brand-border rounded-[2.5rem] p-8 shadow-2xl relative min-h-[500px] flex flex-col">
          <div className="flex-1 min-h-0 relative">

            {/* OVERLAY LOADING */}
            {isHistoryLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brand-secondary/80 backdrop-blur-sm rounded-2xl">
                <Loader2 className="animate-spin text-brand-accent mb-2" size={40} />
                <p className="text-xs font-bold text-brand-accent uppercase tracking-widest">Fetching Historical Data...</p>
              </div>
            )}

            {/* OVERLAY NO DATA */}
            {!isLive && !isHistoryLoading && chartData.length === 0 && (
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center">
                <HistoryIcon className="text-brand-textSecondary mb-2" size={48} />
                <p className="text-brand-textSecondary font-bold uppercase tracking-widest">No data available for this period</p>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.3} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />

                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}
                />

                <Legend verticalAlign="top" align="right" content={(props) => <CustomLegend {...props} availableMetrics={availableMetrics} />} />

                {selectedMetrics.map((key) => {
                  const metric = availableMetrics.find(m => m.key === key);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={metric?.color || '#00f2ff'}
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={true}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

function RecursiveTree({ data, toggleMetric, selectedMetrics, expandedNodes, setExpandedNodes, availableMetrics, path = "" }) {
  return (
    <div className="space-y-1">
      {Object.entries(data).map(([key, value]) => {
        if (key === "_isNode" || key === "_metrics") return null;
        const currentPath = path ? `${path}/${key}` : key;
        const isOpen = expandedNodes[currentPath];
        return (
          <div key={key} className="select-none">
            <div onClick={() => setExpandedNodes(prev => ({ ...prev, [currentPath]: !prev[currentPath] }))} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${isOpen ? 'bg-brand-sidebar' : 'hover:bg-brand-sidebar/50'}`}>
              {isOpen ? <ChevronDown size={14} className="text-brand-accent" /> : <ChevronRight size={14} className="text-brand-textSecondary" />}
              <span className={`text-[10px] font-black uppercase tracking-widest ${isOpen ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}`}>{key}</span>
            </div>
            {isOpen && (
              <div className="ml-4 mt-2 border-l border-brand-border/50 pl-4 space-y-2">
                <RecursiveTree data={value} toggleMetric={toggleMetric} selectedMetrics={selectedMetrics} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} availableMetrics={availableMetrics} path={currentPath} />
                {value._metrics?.map(m => {
                  const active = selectedMetrics.includes(m.key);
                  return (
                    <button key={m.key} onClick={() => toggleMetric(m.key)} className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${active ? 'bg-brand-sidebar border-brand-accent shadow-brand-glow' : 'bg-transparent border-brand-border text-brand-textSecondary hover:border-brand-textPrimary'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-brand-textPrimary' : ''}`}>{m.label}</span>
                      </div>
                      {active && <div className="w-4 h-4 rounded-sm border flex items-center justify-center" style={{ borderColor: m.color }}><div className="w-2 h-2" style={{ backgroundColor: m.color }} /></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CustomLegend = ({ payload, availableMetrics }) => (
  <div className="flex flex-wrap gap-4 justify-end mb-6">
    {payload.map((entry, index) => {
      const metric = availableMetrics.find(m => m.key === entry.dataKey);
      return (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3 h-[2px]" style={{ backgroundColor: entry.color }} />
          <span className="text-[9px] font-black text-brand-textSecondary uppercase tracking-widest">{metric?.path.split('/')[0]} / {entry.value}</span>
        </div>
      );
    })}
  </div>
);

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-brand-primary h-screen">
      <Loader2 className="animate-spin text-brand-accent mb-4" size={50} />
      <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.5em] animate-pulse">Switching Systems...</p>
    </div>
  );
}