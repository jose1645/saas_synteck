import React, { useState, useEffect } from 'react';
import { X, MapPin, ArrowUpRight, Users, Loader2, AlertCircle, Hash, Phone, UserCircle } from 'lucide-react';
import { clientService } from '../services/clientService';

const ClientModal = ({ isOpen, onClose, onClientCreated, clientData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    tax_id: '',
    contact_name: '',
    contact_phone: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Efecto para cargar datos si estamos en modo EDICIÓN
  useEffect(() => {
    if (clientData) {
      setFormData({
        name: clientData.name || '',
        location: clientData.location || '',
        tax_id: clientData.tax_id || '',
        contact_name: clientData.contact_name || '',
        contact_phone: clientData.contact_phone || ''
      });
    } else {
      setFormData({ name: '', location: '', tax_id: '', contact_name: '', contact_phone: '' });
    }
  }, [clientData, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!clientData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEditing) {
        // Lógica de Actualización (PUT)
        await clientService.update(clientData.id, formData);
      } else {
        // Lógica de Creación (POST)
        await clientService.create(formData);
      }
      
      onClientCreated(); 
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al procesar la solicitud";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-100">
        
        {/* Header con color dinámico */}
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${isEditing ? 'bg-blue-50/50' : 'bg-emerald-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white ${isEditing ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'Editar Cliente' : 'Nuevo Cliente Industrial'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Información administrativa de la cuenta</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Sección 1: Datos de Identidad */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Identidad Corporativa</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 ml-1">Nombre Comercial</label>
                <input
                  required
                  className="w-full px-4 py-3 mt-1 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  placeholder="Ej. Industrias Delta S.A."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                  <Hash size={12} /> ID Fiscal / RFC
                </label>
                <input
                  className="w-full px-4 py-3 mt-1 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all uppercase"
                  placeholder="XAXX010101000"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1">
                  <MapPin size={12} /> Estado/Región
                </label>
                <input
                  required
                  className="w-full px-4 py-3 mt-1 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  placeholder="Querétaro, MX"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Contacto Administrativo */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Contacto de Enlace</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <UserCircle className="absolute left-3 top-9 text-slate-400" size={18} />
                <label className="text-xs font-bold text-slate-700 ml-1">Responsable</label>
                <input
                  className="w-full pl-10 pr-4 py-3 mt-1 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  placeholder="Ing. Juan Pérez"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-9 text-slate-400" size={18} />
                <label className="text-xs font-bold text-slate-700 ml-1">Teléfono</label>
                <input
                  className="w-full pl-10 pr-4 py-3 mt-1 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  placeholder="442..."
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold text-white
              ${isEditing ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isEditing ? 'Actualizar Información' : 'Registrar Cliente'} 
                <ArrowUpRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;