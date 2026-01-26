import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Factory, Plus, MapPin, Cpu, ArrowUpRight, 
  Loader2, Inbox, Settings, Edit3, Eye 
} from 'lucide-react';
import ClientModal from '../../components/ClientModal';
import { clientService } from '../../services/clientService';

const ClientsPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para el cliente que se va a editar (null si es creación)
  const [editingClient, setEditingClient] = useState(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleEditClick = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-slate-500 mt-1">Panel de administración de activos industriales</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-xl shadow-blue-200 active:scale-95"
        >
          <Plus size={20} /> Registrar Cliente
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-500 font-semibold text-lg">Sincronizando con el servidor...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
          <div className="p-6 bg-slate-50 rounded-3xl mb-4">
            <Inbox size={64} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No hay clientes en tu red</h3>
          <p className="text-slate-500 mb-8 max-w-sm text-center">Registra tu primera empresa para comenzar a desplegar infraestructura IoT.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-blue-600 font-black text-sm uppercase tracking-widest hover:text-blue-800 transition-colors"
          >
            + Crear mi primer nodo de cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 group relative overflow-hidden">
              
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
                  <Factory size={28} />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    client.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                    {client.is_active ? '● Activo' : '○ Suspendido'}
                    </span>
                </div>
              </div>
              
              {/* Info */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{client.name}</h3>
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                    <MapPin size={16} className="text-blue-400" /> 
                    <span className="text-sm">{client.location || 'Sin ubicación'}</span>
                </div>
              </div>

              {/* Stats Bar */}
              

              {/* Botones de Acción: El Choncho */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => navigate(`/partner/clients/${client.id}`)}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  <Eye size={16} /> Detalle
                </button>
                <button 
                  onClick={() => handleEditClick(client)}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  <Edit3 size={16} /> Editar
                </button>
              </div>
            </div>
          ))}

          {/* Card para añadir nuevo con diseño cohesivo */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="border-4 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-50/50 transition-all group min-h-[320px]"
          >
            <div className="p-5 rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors">
              <Plus size={48} strokeWidth={3} />
            </div>
            <p className="font-black uppercase text-xs tracking-[0.2em]">Nuevo Cliente Industrial</p>
          </button>
        </div>
      )}

      {/* Modal Reutilizable para Creación y Edición */}
      <ClientModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onClientCreated={fetchClients} 
        clientData={editingClient} // Si mandamos esto, el modal se pone en modo "Editar"
      />
    </div>
  );
};

export default ClientsPage;