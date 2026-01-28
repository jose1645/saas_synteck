import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Check, ChevronDown,
  ChevronRight, Layers, Wifi, WifiOff, ChevronLeft,
  History as HistoryIcon, Download, AlertCircle, FileSpreadsheet,
  PanelLeftClose, PanelLeft, Maximize
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { deviceService } from '../services/deviceService';
import { historyService } from '../services/historyService';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { alertService } from '../services/alertService';
import TimeRangeSelector from '../components/TimeRangeSelector';

// Paleta Ciberpunk ampliada para Synteck OS
const CHART_COLORS = [
  '#00f2ff', '#7000ff', '#ff8c00', '#00ff8c',
  '#ff0055', '#fde047', '#0062ff', '#ff0000',
  '#00ffff', '#adff2f', '#ff00ff', '#ffa500'
];

// --- ALGORITMO LTTB (Largest-Triangle-Three-Buckets) ---
const downsampleLTTB = (data, threshold, masterMetric) => {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) return data;

  const sampled = [];
  let sampledIndex = 0;
  const bucketSize = (dataLength - 2) / (threshold - 2);

  let a = 0;
  let maxAreaPoint = 0;
  let nextA = 0;

  sampled[sampledIndex++] = data[a];

  for (let i = 0; i < threshold - 2; i++) {
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += avgRangeStart;
      avgY += (Number(data[avgRangeStart][masterMetric]) || 0);
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    let rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    const pointAX = a;
    const pointAY = (Number(data[a][masterMetric]) || 0);

    let maxArea = -1;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      const area = Math.abs(
        (pointAX - avgX) * ((Number(data[rangeOffs][masterMetric]) || 0) - pointAY) -
        (pointAX - rangeOffs) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }

  sampled[sampledIndex++] = data[dataLength - 1];
  return sampled;
};

// --- HELPER PARA SEGMENTACIÓN DE ALERTAS EN GRÁFICO ---
const enrichPoint = (point, metrics) => {
  metrics.forEach(m => {
    const val = point[m.key];
    if (typeof val === 'number') {
      const isOut = (m.min !== undefined && m.min !== null && val < m.min) ||
        (m.max !== undefined && m.max !== null && val > m.max);
      point[`${m.key}_alert`] = isOut ? val : null;
    }
  });
  return point;
};

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
  const { user, clientData } = useAuth();
  const { branding } = useBranding();
  const socketRef = useRef(null);

  // New State for History
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoomIndices, setZoomIndices] = useState({ start: 0, end: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [timeRange, setTimeRange] = useState('live');
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [summaryData, setSummaryData] = useState([]); // Para volver atrás del zoom-to-detail

  // Buffer de últimos valores conocidos para cada tag
  const [lastKnownValues, setLastKnownValues] = useState({});

  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showUnitAlert, setShowUnitAlert] = useState(false);

  // Auto-cerrar alerta después de 3s
  useEffect(() => {
    if (showUnitAlert) {
      const timer = setTimeout(() => setShowUnitAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showUnitAlert]);

  // 1. CARGA DE CONFIGURACIÓN Y ASIGNACIÓN DE COLORES
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setChartData([]); // Limpiar gráfica al cambiar de planta

        const [devicesRes, alertsRes] = await Promise.all([
          deviceService.getDevicesByPlant(plantId),
          alertService.getActiveAlerts()
        ]);

        const plantDevices = devicesRes.data;
        const deviceIds = new Set(plantDevices.map(d => d.id));

        // Filtrar alertas solo para esta planta
        const filteredAlerts = alertsRes.filter(a => deviceIds.has(a.device_id));
        setActiveAlerts(filteredAlerts);

        const currentDevice = plantDevices[0];
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
            unit: tag.unit || '',
            min: tag.min_value,
            max: tag.max_value,
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
    setIsDetailMode(false);
    setSummaryData([]);

    if (!newIsLive) {
      setConnected(false);
      loadHistory(range);
    } else {
      setChartData([]);
      setZoomIndices({ start: 0, end: 0 });
    }
  };

  const handleCustomRange = (start, end) => {
    setTimeRange('custom');
    setIsLive(false);
    setConnected(false);
    setCustomStart(start);
    setCustomEnd(end);
    setIsDetailMode(false);
    setSummaryData([]);
    loadHistory('custom', start, end);
  };

  const loadHistory = async (range, start = null, end = null, isDetail = false) => {
    if (!deviceInfo) return;
    try {
      setIsHistoryLoading(true);
      if (!isDetail) setChartData([]);

      const rawData = await historyService.getHistory(deviceInfo.aws_iot_uid, range, start, end);
      console.log(`📊 [PlantDetail] Historia recibida (${range}): ${rawData.length} puntos. (Detail: ${isDetail})`);

      let processedData = rawData;
      if (rawData.length > 2000) {
        const masterMetric = selectedMetrics[0] || availableMetrics[0]?.key;
        if (masterMetric) {
          console.log(`⚡ [PlantDetail] Aplicando LTTB sobre ${masterMetric}...`);
          processedData = downsampleLTTB(rawData, 2000, masterMetric);
          console.log(`✨ [PlantDetail] Puntos optimizados: ${processedData.length}`);
        }
      }

      setChartData(processedData.map(p => enrichPoint({ ...p }, availableMetrics)));

      if (!isDetail) {
        setZoomIndices({ start: 0, end: processedData.length > 0 ? processedData.length - 1 : 0 });
        setSummaryData(processedData);
        setIsDetailMode(false);
      } else {
        setZoomIndices({ start: 0, end: processedData.length > 0 ? processedData.length - 1 : 0 });
        setIsDetailMode(true);
      }
    } catch (e) {
      console.error("Error loading history:", e);
      alert("Error cargando históricos.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadDataAlertsOnly = async () => {
    if (!plantId) return;
    try {
      const [devicesRes, alertsRes] = await Promise.all([
        deviceService.getDevicesByPlant(plantId),
        alertService.getActiveAlerts()
      ]);
      const deviceIds = new Set(devicesRes.data.map(d => d.id));
      setActiveAlerts(alertsRes.filter(a => deviceIds.has(a.device_id)));
    } catch (err) {
      console.error("❌ Error recargando alertas:", err);
    }
  };

  // Refresco automático de alertas
  useEffect(() => {
    const interval = setInterval(loadDataAlertsOnly, 30000);
    return () => clearInterval(interval);
  }, [plantId]);

  const handleResetDetail = () => {
    if (summaryData.length > 0) {
      setChartData(summaryData);
      setZoomIndices({ start: 0, end: summaryData.length - 1 });
      setIsDetailMode(false);
    }
  };

  // Zoom-to-Detail automático: Si el usuario ve < 15% de la data y no estamos ya en modo detalle
  useEffect(() => {
    if (isLive || chartData.length === 0 || isHistoryLoading || isDetailMode) return;
    if (timeRange === '1h' || timeRange === '6h') return;

    const { start, end } = zoomIndices;
    const totalPoints = chartData.length;
    const visiblePoints = end - start;

    if (visiblePoints > 0 && totalPoints > 100 && (visiblePoints / totalPoints) < 0.15) {
      const startItem = chartData[start];
      const endItem = chartData[end];
      if (!startItem || !endItem) return;

      const timer = setTimeout(() => {
        console.log("🔍 [PlantDetail] Zoom profundo. Solicitando alta resolución...");
        loadHistory('custom', startItem.time, endItem.time, true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [zoomIndices, isLive, isDetailMode, timeRange, isHistoryLoading]);

  // Actualizar índices de zoom basados en la longitud de datos reales
  useEffect(() => {
    if (!isLive && chartData.length > 0 && (zoomIndices.start === 0 && zoomIndices.end === 0)) {
      setZoomIndices({ start: 0, end: chartData.length - 1 });
    }
  }, [chartData.length, isLive]);

  const handleDownload = async (format = 'xlsx') => {
    if (!deviceInfo) return;
    setIsExporting(true);
    try {
      await historyService.downloadHistory(
        deviceInfo.aws_iot_uid,
        timeRange,
        customStart,
        customEnd,
        format
      );
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Error descargando ${format.toUpperCase()}.`);
    } finally {
      setIsExporting(false);
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
    const partnerId = user?.partner_id ?? 1;

    const getWsBaseUrl = () => {
      if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;

      // Fallback dinámico usando VITE_API_URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const protocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''); // Remove trailing slash

      // Si VITE_API_URL incluye "/api", lo preservamos porque Nginx lo necesita
      // Si estamos en localhost directo sin nginx, puede que no necesitemos /api, 
      // pero para producción (domain/api) es vital.
      return `${protocol}://${host}/monitor/ws`;
    };

    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/${partnerId}/${clientId}/${plantId}/${deviceUid}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const incomingVals = data.telemetry;

        if (incomingVals) {
          // Redondear todos los valores numéricos a 2 decimales
          const roundedVals = {};
          Object.keys(incomingVals).forEach(key => {
            const value = incomingVals[key];
            roundedVals[key] = typeof value === 'number'
              ? Math.round(value * 100) / 100
              : value;
          });

          // Actualizar buffer de últimos valores conocidos
          setLastKnownValues(prev => ({
            ...prev,
            ...roundedVals
          }));

          setChartData(prev => {
            const now = new Date();
            let newEntry = {
              time: now.toISOString(), // ISO para consistencia
              timestamp: now.getTime(),
              ...roundedVals
            };

            // Enriquecer con estados de alerta para visualización de línea
            newEntry = enrichPoint(newEntry, availableMetrics);

            // Mantener solo datos de los últimos 2 minutos (120,000 ms)
            const threshold = now.getTime() - (2 * 60 * 1000);
            const updated = [...prev, newEntry].filter(entry => entry.timestamp > threshold);

            return updated;
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
  }, [plantId, loading, availableMetrics.length, isLive, user]);

  // Manejador para el Zoom con Scroll (NATIVO para evitar error de Passive Listener)
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const onWheelNative = (e) => {
      if (isLive || chartData.length === 0) return;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // PREVENIR SCROLL DE LA PÁGINA (Solo funciona en listeners no-pasivos)
        e.preventDefault();

        const delta = e.deltaY;
        const zoomFactor = 0.05;
        const currentRange = zoomIndices.end - zoomIndices.start;
        const zoomAmount = Math.max(1, Math.floor(currentRange * zoomFactor));

        setZoomIndices(prev => {
          let newStart, newEnd;
          if (delta < 0) {
            newStart = Math.min(prev.end - 5, prev.start + zoomAmount);
            newEnd = Math.max(prev.start + 5, prev.end - zoomAmount);
          } else {
            newStart = Math.max(0, prev.start - zoomAmount);
            newEnd = Math.min(chartData.length - 1, prev.end + zoomAmount);
          }
          return { start: newStart, end: newEnd };
        });
      }
    };

    // Agregar con { passive: false } para poder usar preventDefault()
    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', onWheelNative);
  }, [isLive, chartData.length, zoomIndices.start, zoomIndices.end]);

  const handleBrushChange = (indices) => {
    if (indices && typeof indices.startIndex === 'number' && typeof indices.endIndex === 'number') {
      setZoomIndices({ start: indices.startIndex, end: indices.endIndex });
    }
  };

  // Panning Handlers
  const handleMouseDown = (e) => {
    if (isLive || chartData.length === 0) return;
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isLive || chartData.length === 0) return;
    const deltaX = e.clientX - dragStart;
    const sensitivity = 4;
    const moveAmount = Math.floor(deltaX / sensitivity);

    if (Math.abs(moveAmount) >= 1) {
      setZoomIndices(prev => {
        const range = prev.end - prev.start;
        let newStart = prev.start - moveAmount;
        let newEnd = prev.end - moveAmount;
        if (newStart < 0) {
          newStart = 0;
          newEnd = range;
        }
        if (newEnd > chartData.length - 1) {
          newEnd = chartData.length - 1;
          newStart = newEnd - range;
        }
        return { start: newStart, end: newEnd };
      });
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 3. HANDLER DE SELECCIÓN DE MÉTRICAS (Restringido por unidad)
  const handleToggleMetric = (key) => {
    const targetMetric = availableMetrics.find(m => m.key === key);
    if (!targetMetric) return;

    setSelectedMetrics(prev => {
      // Si ya está seleccionada, simplemente la quitamos
      if (prev.includes(key)) {
        return prev.filter(m => m !== key);
      }

      // Si no hay ninguna seleccionada, la agregamos directamente
      if (prev.length === 0) {
        return [key];
      }

      // Verificar la unidad de las métricas ya seleccionadas
      const firstSelectedKey = prev[0];
      const firstSelectedMetric = availableMetrics.find(m => m.key === firstSelectedKey);

      // Si la unidad es compatible (MISMA UNIDAD EXACTA), permitimos selección múltiple
      if (firstSelectedMetric?.unit === targetMetric.unit) {
        return [...prev, key];
      }

      // Si NO es compatible, mostramos alerta y reemplazamos selección
      setShowUnitAlert(true);
      return [key]; // Reemplaza la selección actual con la nueva
    });
  };

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

      {/* SIDEBAR DINÁMICO (ESTRUCTURA INDUSTRIAL) */}
      <aside className={`relative border-r border-brand-border flex flex-col transition-all duration-300 z-30 ${isSidebarOpen ? 'w-80' : 'w-0 border-r-0'}`}>
        {/* Botón flotante en el margen */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-brand-accent text-brand-primary rounded-full p-1 shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:brightness-110 transition-all z-50 border-2 border-brand-primary"
          title={isSidebarOpen ? "Cerrar Estructura" : "Abrir Estructura"}
        >
          {isSidebarOpen ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
        </button>

        <div className={`flex flex-col h-full w-80 overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 p-6' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-3 mb-8 border-b border-brand-border pb-4">
            <Layers size={18} className="text-brand-accent" />
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">Maquinaria</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
            <RecursiveTree
              data={treeData}
              toggleMetric={handleToggleMetric}
              selectedMetrics={selectedMetrics}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
              availableMetrics={availableMetrics}
              currentValues={lastKnownValues}
            />
          </div>

          {/* ALERTA DE RESTRICCIÓN DE UNIDADES */}
          {showUnitAlert && (
            <div className="mx-4 mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-500 leading-tight uppercase tracking-tight">
                  Restricción: Solo puedes visualizar variables del mismo tipo.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA DE GRÁFICA */}
      <main className="flex-1 flex flex-col gap-6 overflow-hidden">
        <header className="flex justify-between items-center mb-4 bg-brand-secondary p-4 rounded-2xl border border-brand-border">
          <div className="flex items-center gap-4">
            {branding.logoUrl && (
              <div className="flex flex-col items-start justify-center">
                <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
                <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest mt-1">
                  {(clientData?.name || branding.name)} SA
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {/* TOGGLE LIVE / HISTORICO */}
            <div className="flex items-center gap-2 bg-brand-primary rounded-full p-1 border border-brand-border">
              {isDetailMode && !isLive && (
                <button
                  onClick={handleResetDetail}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-all animate-in fade-in zoom-in duration-300"
                  title="Return to full summary view"
                >
                  <Maximize size={12} /> Reset Detail
                </button>
              )}
              <div className="flex items-center">
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
                  onClick={() => handleDownload('xlsx')}
                  disabled={isExporting}
                  className={`p-2 rounded-lg transition-all border flex items-center gap-1.5 shadow-sm active:scale-95 ${isExporting
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 cursor-wait'
                    : 'bg-brand-secondary hover:bg-emerald-600 hover:text-white text-brand-textSecondary border-brand-border'
                    }`}
                  title={isExporting ? "Generando Excel..." : "Download Excel"}
                >
                  {isExporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={14} />
                  )}
                  <span className="text-[8px] font-black uppercase tracking-tighter">
                    {isExporting ? 'Generando...' : 'Exportar Excel'}
                  </span>
                </button>
              </div>
            )}

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${connected ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-red-500/30 bg-red-500/5 text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{connected ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-brand-secondary border border-brand-border rounded-[2.5rem] p-8 shadow-2xl relative min-h-[500px] flex flex-col overflow-hidden">
          <div
            ref={chartContainerRef}
            className={`flex-1 min-h-[400px] relative ${!isLive ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >

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

            <ResponsiveContainer width="100%" height="100%" minHeight={400} minWidth={0}>
              <LineChart data={chartData} margin={{ bottom: 80 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--brand-textSecondary)" opacity={0.15} vertical={true} horizontal={true} />
                <XAxis
                  xAxisId={0}
                  dataKey="time"
                  stroke="var(--text-secondary)"
                  fontSize={13}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                  interval="preserveStartEnd"
                  minTickGap={50}
                  tickFormatter={(str) => {
                    try {
                      const date = new Date(str);
                      if (isNaN(date.getTime())) return str;
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch (e) { return str; }
                  }}
                />

                {!isLive && (
                  <XAxis
                    xAxisId={1}
                    dataKey="time"
                    orientation="bottom"
                    stroke="var(--brand-accent)"
                    tick={{ fill: 'white', opacity: 0.9 }}
                    fontSize={13}
                    fontWeight="900"
                    tickLine={false}
                    axisLine={false}
                    dy={35}
                    interval="preserveStartEnd"
                    minTickGap={100}
                    tickFormatter={(str) => {
                      try {
                        const date = new Date(str);
                        if (isNaN(date.getTime())) return '';
                        return date.toLocaleDateString([], { day: 'numeric', month: 'short' }).toUpperCase();
                      } catch (e) { return ''; }
                    }}
                  />
                )}
                <YAxis stroke="var(--text-secondary)" fontSize={13} fontWeight="bold" tickLine={false} axisLine={false} />

                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: '900', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                  labelFormatter={(str) => {
                    try {
                      const date = new Date(str);
                      if (isNaN(date.getTime())) return str;
                      return date.toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      });
                    } catch (e) { return str; }
                  }}
                  formatter={(value, name) => {
                    const metric = availableMetrics.find(m => m.key === name);
                    return [`${value} ${metric?.unit || ''}`, name];
                  }}
                />

                {!isLive && chartData.length > 0 && (
                  <Brush
                    dataKey="time"
                    height={30}
                    stroke="var(--brand-accent)"
                    fill="transparent"
                    startIndex={zoomIndices.start}
                    endIndex={zoomIndices.end}
                    onChange={handleBrushChange}
                    tickFormatter={() => ''}
                    travellerWidth={10}
                    className="custom-brush"
                    style={{ opacity: 0.6 }}
                  />
                )}

                <Legend verticalAlign="top" align="right" content={(props) => <CustomLegend {...props} availableMetrics={availableMetrics} />} />

                {selectedMetrics.map((key) => {
                  const metric = availableMetrics.find(m => m.key === key);
                  const color = metric?.color || CHART_COLORS[selectedMetrics.indexOf(key) % CHART_COLORS.length];
                  return (
                    <g key={`group-${key}`}>
                      {/* LÍNEA DE TENDENCIA BASE */}
                      <Line
                        xAxisId={0}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        animationDuration={300}
                        isAnimationActive={isLive}
                        connectNulls={true}
                      />
                      {/* LÍNEA DE ALERTA (SUPERPUESTA EN ROJO) */}
                      <Line
                        xAxisId={0}
                        type="monotone"
                        dataKey={`${key}_alert`}
                        stroke="#ff0000"
                        strokeWidth={4}
                        dot={false}
                        activeDot={false}
                        animationDuration={300}
                        isAnimationActive={isLive}
                        connectNulls={false}
                        strokeDasharray="5 5"
                      />
                    </g>
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

function RecursiveTree({ data, toggleMetric, selectedMetrics, expandedNodes, setExpandedNodes, availableMetrics, currentValues = {}, path = "" }) {
  return (
    <div className="space-y-1">
      {Object.entries(data).map(([key, value]) => {
        if (key === "_isNode" || key === "_metrics") return null;
        const currentPath = path ? `${path}/${key}` : key;
        const isOpen = expandedNodes[currentPath];
        return (
          <div key={key} className="select-none">
            <div
              onClick={() => setExpandedNodes(prev => ({ ...prev, [currentPath]: !prev[currentPath] }))}
              className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-300 ${isOpen ? 'bg-brand-sidebar text-brand-textPrimary' : 'text-brand-textSecondary hover:bg-brand-sidebar/50 hover:text-brand-textPrimary'}`}
            >
              <div className="flex items-center gap-4">
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isOpen ? 'text-brand-accent' : '-rotate-90 opacity-40'}`}
                />
                <span className={`text-[13px] font-black tracking-wider uppercase truncate`}>
                  {key}
                </span>
              </div>
              {isOpen && <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shadow-[0_0_10px_#00f2ff]" />}
            </div>
            {isOpen && (
              <div className="ml-4 mt-2 border-l-2 border-brand-border/30 pl-6 space-y-2.5 animate-in slide-in-from-left-1 duration-300">
                <RecursiveTree data={value} toggleMetric={toggleMetric} selectedMetrics={selectedMetrics} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} availableMetrics={availableMetrics} currentValues={currentValues} path={currentPath} />
                {value._metrics?.map(m => {
                  const active = selectedMetrics.includes(m.key);
                  const currentValue = currentValues[m.key];
                  const displayValue = currentValue !== undefined
                    ? (typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue)
                    : '--';
                  return (
                    <button key={m.key} onClick={() => toggleMetric(m.key)} className={`w-full flex items-center justify-between py-3 px-5 rounded-xl border-2 transition-all duration-200 ${active ? 'bg-brand-sidebar border-brand-accent/50 shadow-lg' : 'bg-transparent border-transparent text-brand-textSecondary hover:bg-brand-sidebar/30'}`}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className={`text-[14px] font-black tracking-tight ${active ? 'text-brand-textPrimary' : ''} truncate w-full uppercase`}>{m.label}</span>
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[15px] font-mono font-black ${active ? 'text-brand-accent' : 'text-brand-textSecondary'}`}>
                              {displayValue}
                            </span>
                            {m.unit && (
                              <span className="text-[10px] font-black opacity-60 tracking-wider uppercase">
                                {m.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: 'var(--brand-accent)' }}>
                          <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_#00f2ff]" />
                        </div>
                      )}
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
        <div key={index} className="flex items-center gap-3 px-5 py-2.5 bg-brand-primary/40 rounded-xl border border-brand-border/30 shadow-sm">
          <div className="w-6 h-[4px] rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[13px] font-black text-brand-textSecondary tracking-widest uppercase italic">{metric?.path.split('/')[0]} / {entry.value}</span>
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