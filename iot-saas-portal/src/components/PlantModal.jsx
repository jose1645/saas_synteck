import React, { useState } from 'react';
import { X, Factory, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { plantService } from '../services/plantService'; // Importamos el servicio

const PlantModal = ({ isOpen, onClose, onSubmit, clientName, clientId }) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    description: '' // Opcional, pero se limpia al final
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Preparamos el payload exacto que espera schemas.PlantCreate
      const payload = {
        name: formData.name,
        city: formData.city,
        client_id: Number(clientId) // Aseguramos que sea número
      };

      await plantService.createPlant(payload);
      
      // Limpiamos y notificamos al padre (ClientDetail) que refresque la lista
      setFormData({ name: '', city: '', description: '' });
      onSubmit(); 
      onClose();
    } catch (error) {
      console.error("Error al crear la planta:", error);
      alert("No se pudo crear la planta. Verifique los permisos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registrar Planta</h2>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Cliente: {clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Nombre de la Sede</label>
            <div className="relative">
              <Factory className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                required
                type="text"
                placeholder="Ej. Planta de Inyección Norte"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Ciudad / Estado</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                required
                type="text"
                placeholder="Ej. Querétaro, Qro."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-medium"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
              ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-800'}`}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>Crear Planta Industrial <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlantModal;