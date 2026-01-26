import React from 'react';
import { X, Cpu, CheckCircle, XCircle } from 'lucide-react';

const ViewDevicesModal = ({ isOpen, onClose, plantName, devices }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Inventario de Activos</h2>
            <p className="text-sm text-slate-500 font-medium">Ubicación: <span className="text-blue-600">{plantName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {devices.length === 0 ? (
            <div className="text-center py-10">
              <Cpu size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-bold">No hay equipos instalados en esta planta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-blue-50/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{device.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{device.protocol} | {device.device_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_active ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        <CheckCircle size={12} /> ONLINE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        <XCircle size={12} /> OFFLINE
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
            Cerrar Inventario
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDevicesModal;