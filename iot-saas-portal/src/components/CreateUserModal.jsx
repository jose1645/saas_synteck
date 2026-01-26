import React, { useState } from 'react';
import { X, Mail, User, Loader2, ShieldCheck, Send } from 'lucide-react';
import { clientService } from '../services/clientService';

const CreateUserModal = ({ isOpen, onClose, clientId, clientName, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Ahora enviamos solo los datos necesarios para que el backend
      // dispare el correo de configuración/invitación
      await clientService.createUser(Number(clientId), formData);
      setFormData({ email: '', full_name: '' });
      onSuccess(); 
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al enviar la invitación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header del Modal */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <ShieldCheck size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestión de Accesos</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">Invitar Usuario</h2>
            <p className="text-xs text-slate-500 font-medium">Se enviará un correo de configuración para: <span className="text-slate-900 font-bold">{clientName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-shake">
              <X size={14} className="bg-red-500 text-white rounded-full p-0.5" /> {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre Completo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Nombre del operador"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Enviar Invitación
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4 font-medium uppercase tracking-tighter">
              El usuario recibirá un enlace para crear su contraseña
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;