import React, { useState } from 'react';
import { X, Zap, Globe, Info, Loader2, Cpu, Download, CheckCircle2 } from 'lucide-react';
import api from '../api';

// Constante del Certificado Raíz (Como el Backend se puso difícil, lo aseguramos aquí)
const AWS_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----`;

const DeviceModal = ({ isOpen, onClose, plantName, plantId, onSuccess }) => {
  const [step, setStep] = useState('form'); // 'form' | 'provisioning' | 'success'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certs, setCerts] = useState(null);
  const [deviceData, setDeviceData] = useState({
    name: '',
    device_type: 'Gateway',
    protocol: 'MQTT',
    aws_iot_uid: 'SN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
  });

  if (!isOpen) return null;

  const downloadFile = (filename, content) => {
    try {
      console.log(`📥 [Download] Descargando: ${filename}`);
      const element = document.createElement("a");
      const file = new Blob([content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
      console.log(`✅ [Download] ${filename} descargado exitosamente`);
    } catch (error) {
      console.error(`❌ [Download] Error descargando ${filename}:`, error);
      alert(`Error al descargar ${filename}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceData.name) return alert("El nombre es obligatorio");

    setIsSubmitting(true);
    try {
      // 1. Crear el dispositivo en DB
      const { data: newDevice } = await api.post('/devices/', { ...deviceData, plant_id: plantId, modbus_config: {} });

      setStep('provisioning');

      // 2. Aprovisionar en AWS IoT
      const { data: provisionData } = await api.post(`/devices/${newDevice.id}/provision`);

      // Guardar certs (inyectando el Root CA que ya tenemos aquí)
      setCerts({
        ...provisionData,
        rootCA: AWS_ROOT_CA
      });

      setStep('success');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
      alert("Error: " + (error.response?.data?.detail || "Fallo en el proceso"));
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-2">
              {step === 'success' ? 'Vínculo Exitoso' : 'MQTT Provisioning'}
              {step === 'success' && <CheckCircle2 className="text-green-500" />}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Planta: <span className="text-blue-600">{plantName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Hardware Identity Card */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Hardware ID</label>
              <div className="flex items-center justify-between">
                <code className="text-blue-400 font-mono text-lg font-bold">{deviceData.aws_iot_uid}</code>
                <Zap size={18} className="text-amber-400" />
              </div>
            </div>

            <input
              required
              type="text"
              placeholder="Alias del Dispositivo"
              value={deviceData.name}
              onChange={(e) => setDeviceData({ ...deviceData, name: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-800"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Vincular Activo <Cpu /></>}
            </button>
          </form>
        )}

        {step === 'provisioning' && (
          <div className="p-12 text-center space-y-4">
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h3 className="text-lg font-black text-slate-900 uppercase">Creando Identidad en la Nube</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Generando certificados de seguridad X.509...</p>
          </div>
        )}

        {step === 'success' && certs && (
          <div className="p-8 space-y-4">
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-4">
              <p className="text-[10px] font-bold text-green-700 uppercase leading-tight">
                El dispositivo ha sido registrado. Descarga las llaves para configurar tu cliente MQTT.
              </p>
            </div>

            {/* Botón para descargar TODO */}
            <button
              onClick={() => {
                console.log('🎯 [Descarga Masiva] Iniciando descarga de todos los archivos...');
                console.log('📊 [Certs Object]:', certs);
                console.log('📦 [Device Data]:', deviceData);

                try {
                  downloadFile(`${deviceData.aws_iot_uid}-certificate.pem.crt`, certs.certificatePem);
                  downloadFile(`${deviceData.aws_iot_uid}-private.pem.key`, certs.privateKey);
                  downloadFile(`${deviceData.aws_iot_uid}-public.pem.key`, certs.publicKey);
                  downloadFile(`AmazonRootCA1.pem`, certs.rootCA);
                  const config = {
                    device_uid: deviceData.aws_iot_uid,
                    endpoint: certs.endpoint,
                    device_name: deviceData.name
                  };
                  downloadFile(`${deviceData.aws_iot_uid}-config.json`, JSON.stringify(config, null, 2));
                  console.log('✅ [Descarga Masiva] Todos los archivos procesados');
                } catch (error) {
                  console.error('❌ [Descarga Masiva] Error:', error);
                  alert('Error durante la descarga masiva. Revisa la consola para más detalles.');
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              <Download size={18} /> Descargar Todos los Archivos
            </button>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => downloadFile(`${deviceData.aws_iot_uid}-certificate.pem.crt`, certs.certificatePem)}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <span className="text-[10px] font-black uppercase text-slate-600">Certificado del Activo</span>
                <Download size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => downloadFile(`${deviceData.aws_iot_uid}-private.pem.key`, certs.privateKey)}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <span className="text-[10px] font-black uppercase text-slate-600">Llave Privada</span>
                <Download size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => downloadFile(`${deviceData.aws_iot_uid}-public.pem.key`, certs.publicKey)}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <span className="text-[10px] font-black uppercase text-slate-600">Llave Pública</span>
                <Download size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => downloadFile(`AmazonRootCA1.pem`, certs.rootCA)}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <span className="text-[10px] font-black uppercase text-slate-600">Amazon Root CA</span>
                <Download size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => {
                  const config = {
                    device_uid: deviceData.aws_iot_uid,
                    endpoint: certs.endpoint,
                    device_name: deviceData.name
                  };
                  downloadFile(`${deviceData.aws_iot_uid}-config.json`, JSON.stringify(config, null, 2));
                }}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
              >
                <span className="text-[10px] font-black uppercase text-slate-600">Archivo de Configuración</span>
                <Download size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[9px] font-bold text-blue-800 uppercase mb-1">MQTT Endpoint:</p>
              <code className="text-[10px] text-blue-600 font-mono break-all">{certs.endpoint}</code>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest mt-4"
            >
              Cerrar y Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceModal;