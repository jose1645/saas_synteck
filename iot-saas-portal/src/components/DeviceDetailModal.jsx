import React, { useState, useEffect } from "react";
import {
  X, Cpu, ShieldCheck, Download, Loader2, Zap,
  CheckCircle2, AlertTriangle, RefreshCw, Key, Info, Copy, Check, Globe
} from "lucide-react";
import { deviceService } from "../services/deviceService";

export default function DeviceDetailModal({ isOpen, onClose, device, onRefresh }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionData, setProvisionData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && device) {
      checkProvisionStatus();
    }
    return () => {
      setProvisionData(null);
      setStatus(null);
    };
  }, [isOpen, device]);

  const checkProvisionStatus = async () => {
    setLoading(true);
    try {
      const res = await deviceService.getProvisionStatus(device.id);
      setStatus(res.data);
    } catch (err) {
      console.error("Error al verificar status", err);
    } finally {
      setStatus(prev => ({ ...prev, is_provisioned: prev?.is_provisioned || false })); // Fallback por si falla el API
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content, filename) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadAll = (data) => {
    const targetData = data || provisionData;
    if (!targetData) return;
    downloadFile(targetData.certificatePem, `${device.aws_iot_uid}-cert.pem.crt`);
    downloadFile(targetData.privateKey, `${device.aws_iot_uid}-private.pem.key`);
    downloadFile(targetData.publicKey, `${device.aws_iot_uid}-public.pem.key`);
  };

  const handleProvision = async () => {
    const isRotating = status?.is_provisioned;
    if (isRotating && !window.confirm("⚠️ ¿ROTAR SEGURIDAD? Los certificados actuales dejarán de funcionar. El integrador deberá actualizar el equipo físico con los nuevos archivos.")) {
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await deviceService.provisionDevice(device.id);
      const newKeys = res.data;
      setProvisionData(newKeys);
      handleDownloadAll(newKeys);
      if (onRefresh) onRefresh();
      await checkProvisionStatus();
    } catch (err) {
      alert("Error: " + (err.response?.data?.detail || "Fallo en la comunicación"));
    } finally {
      setIsProvisioning(false);
    }
  };

  const formatTopicName = (name) => name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || "default";

  const topicPath = status?.is_provisioned
    ? `${formatTopicName(device.plant?.client?.name)}/${formatTopicName(device.plant?.name)}/${device.aws_iot_uid}/#`
    : "Pendiente de generar...";

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95">

        {/* HEADER */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
          <div className="flex gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${status?.aws_sync ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
              <Cpu size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{device.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-70">Hardware UID: {device.aws_iot_uid}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        {/* CONTENIDO */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Loader2 className="animate-spin mb-3" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando con Broker...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CARD DE ESTADO */}
              <div className={`p-6 rounded-[28px] border-2 transition-all ${!status?.is_provisioned ? 'bg-slate-50 border-slate-100' :
                  status?.aws_sync ? 'bg-indigo-50/30 border-indigo-100' : 'bg-red-50 border-red-100'
                }`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-wider ${status?.aws_sync ? 'text-indigo-700' : 'text-slate-700'}`}>
                      Identidad White-Label
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {status?.aws_sync
                        ? "Identidad activa bajo jerarquía personalizada de integrador."
                        : "El dispositivo no tiene una identidad digital vinculada al ecosistema."}
                    </p>
                  </div>
                  {status?.aws_sync ? <CheckCircle2 className="text-indigo-600" size={24} /> : <AlertTriangle className="text-amber-500" size={24} />}
                </div>

                <button
                  onClick={handleProvision}
                  disabled={isProvisioning}
                  className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all ${status?.is_provisioned
                      ? 'bg-slate-800 text-white hover:bg-black'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                    } disabled:opacity-50`}
                >
                  {isProvisioning ? <Loader2 className="animate-spin" size={18} /> : status?.is_provisioned ? <RefreshCw size={18} /> : <Zap size={18} />}
                  {status?.is_provisioned ? "ROTAR LLAVES DE SEGURIDAD" : "APROVISIONAR DISPOSITIVO"}
                </button>
              </div>

              {/* HISTORICAL DATA TOGGLE */}
              <div className="p-6 rounded-[28px] border-2 bg-slate-50 border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Download size={14} /> Almacenamiento Histórico
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {device.history_enabled
                      ? "El sistema está guardando telemetría en AWS Timestream."
                      : "Solo visualización en tiempo real (Live Streaming)."}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await deviceService.updateDevice(device.id, { history_enabled: !device.history_enabled });
                      // Actualizar prop localmente o recargar
                      if (onRefresh) onRefresh();
                      // Truco rápido para actualizar la UI local sin recargar todo el padre si onRefresh no es suficiente
                      device.history_enabled = !device.history_enabled;
                      setStatus(prev => ({ ...prev })); // Force re-render
                    } catch (e) { alert("Error actualizando configuración"); }
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${device.history_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${device.history_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* INFO PARA EL INTEGRADOR */}
              {status?.is_provisioned && (
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-5">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Parámetros de Configuración</span>
                  </div>

                  {/* ENDPOINT */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">MQTT Broker Endpoint</p>
                    <code className="block text-[11px] font-mono text-slate-600 bg-white p-3 rounded-xl border border-slate-100 truncate">
                      {status.details?.endpoint || 'a1uw1qi4z3nyi4-ats.iot.us-east-1.amazonaws.com'}
                    </code>
                  </div>

                  {/* TOPIC PATH */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Topic Root Path</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-[11px] font-mono text-indigo-600 font-bold bg-white p-3 rounded-xl border border-slate-100 truncate">
                        {topicPath}
                      </code>
                      <button
                        onClick={() => copyToClipboard(topicPath)}
                        className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* ROOT CA DOWNLOAD (DIRECT URL) */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Seguridad de Red (TLS 1.2)</p>
                    <a
                      href="https://www.amazontrust.com/repository/AmazonRootCA1.pem"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-xl border border-indigo-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Globe size={14} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Descargar Amazon Root CA 1</span>
                      </div>
                      <Download size={14} className="text-indigo-600 group-hover:translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              )}

              {/* SECCIÓN DE DESCARGA DE LLAVES NUEVAS */}
              {provisionData && (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[28px] animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <Key size={16} />
                    </div>
                    <h4 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Nuevas Llaves Generadas</h4>
                  </div>
                  <button
                    onClick={() => handleDownloadAll()}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95"
                  >
                    <Download size={18} /> DESCARGAR PAQUETE DE DISPOSITIVO (.CRT / .KEY)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-60">
            Broker Provider: AWS IoT Core | Security: X.509 mTLS
          </p>
          <button onClick={onClose} className="px-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all shadow-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}