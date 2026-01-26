import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Box, Cpu, MapPin, ArrowRight, Loader2, AlertCircle,
  Users, Factory, ShieldCheck, Mail, Edit2, Trash2, Database
} from 'lucide-react';
import CreateUserModal from '../../components/CreateUserModal';
import { plantService } from '../../services/plantService';
import { clientService } from '../../services/clientService'; // Importamos el servicio actualizado

import DeviceModal from '../../components/DeviceModal';
import PlantModal from '../../components/PlantModal';
import ViewDevicesModal from '../../components/ViewDevicesModal';

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  // UI State
  const [activeTab, setActiveTab] = useState('infrastructure'); // 'infrastructure' | 'users'
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data State
  const [clientInfo, setClientInfo] = useState(null);
  const [plants, setPlants] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);

  // Modal State
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [isViewDevicesOpen, setIsViewDevicesOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [devicesToView, setDevicesToView] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  /* =========================
      Sincronización de Datos (Infraestructura)
  ========================= */
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    try {
      setIsLoading(true);
      const [clientRes, plantsRes] = await Promise.all([
        plantService.getClientInfo(clientId),
        plantService.getPlantsByClient(clientId)
      ]);
      setClientInfo(clientRes.data);
      setPlants(plantsRes.data);
    } catch (err) {
      setError("Error al sincronizar datos industriales.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  /* =========================
      Sincronización de Usuarios
  ========================= */
  const fetchUsers = useCallback(async () => {
    if (!clientId) return;
    try {
      setIsUsersLoading(true);
      const users = await clientService.getUsers(Number(clientId));
      setClientUsers(users);
    } catch (err) {
      console.error("❌ Error cargando usuarios:", err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [clientId]);

  // Efecto inicial para Info Base
  useEffect(() => { fetchData(); }, [fetchData]);

  // Efecto disparado por cambio de Tab
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  if (isLoading) return (
    <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-bold animate-pulse">Sincronizando con el Nodo Central...</p>
    </div>
  );

  return (
    <div className="p-8 animate-in fade-in duration-500">
      {/* Navegación Superior */}
      <button onClick={() => navigate('/partner/clients')} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-6 font-semibold text-sm group">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver a Clientes
      </button>

      {/* Header Cliente */}
      <div className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-slate-900 italic tracking-tight">{clientInfo?.name}</h1>
          <p className="text-slate-500 flex items-center gap-2 font-medium mt-1">
            <MapPin size={16} className="text-blue-500" /> {clientInfo?.location || 'Sin Ubicación'} | ID: {clientId}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-100 p-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-[10px] font-black text-slate-400 uppercase">Plantas</p>
            <p className="text-xl font-black text-slate-800">{plants.length}</p>
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex gap-8 mb-8 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`pb-4 text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === 'infrastructure' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          <Factory size={18} /> Infraestructura
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === 'users' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          <Users size={18} /> Gestión de Usuarios
        </button>
      </div>

      {/* SECCIÓN 1: INFRAESTRUCTURA */}
      {activeTab === 'infrastructure' ? (
        <div className="animate-in slide-in-from-left-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">Unidades de Producción</h2>
            <button onClick={() => setIsPlantModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95">
              <Plus size={20} /> Registrar Planta
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {plants.length === 0 ? (
              <EmptyState icon={<Box size={60} />} title="Sin plantas registradas" subtitle="Registre una planta para comenzar a instalar dispositivos IoT." />
            ) : (
              plants.map(plant => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onView={async () => {
                    setSelectedPlant(plant);
                    try {
                      const devicesRes = await plantService.getDevicesByPlant(plant.id);
                      setDevicesToView(devicesRes.data || []);
                      setIsViewDevicesOpen(true);
                    } catch (error) {
                      console.error("Error loading devices:", error);
                      alert("❌ Error al cargar el inventario de dispositivos");
                    }
                  }}
                  onAdd={() => { setSelectedPlant(plant); setIsDeviceModalOpen(true); }}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        /* SECCIÓN 2: GESTIÓN DE USUARIOS (REAL) */
        <div className="animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Accesos Autorizados</h2>
              <p className="text-sm text-slate-500">Cuentas con acceso al panel de telemetría de este cliente.</p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-xl active:scale-95"
            >
              <Plus size={20} /> Crear Nuevo Acceso
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuario Operador</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nivel de Acceso</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isUsersLoading ? (
                  <tr>
                    <td colSpan="4" className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={30} />
                        <p className="text-slate-400 text-sm font-bold">Consultando DB de Usuarios...</p>
                      </div>
                    </td>
                  </tr>
                ) : clientUsers.length > 0 ? (
                  clientUsers.map(user => (
                    <UserRow key={user.id} user={user} />
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-20">
                      <EmptyState
                        icon={<ShieldCheck size={48} />}
                        title="No hay usuarios"
                        subtitle="Este cliente no tiene accesos creados. Cree uno para que el cliente pueda entrar a su dashboard."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        clientId={clientId}
        clientName={clientInfo?.name}
        onSuccess={fetchUsers} // Esta función recarga la lista automáticamente
      />
      <PlantModal
        isOpen={isPlantModalOpen}
        onClose={() => setIsPlantModalOpen(false)}
        onSubmit={fetchData} // Al terminar, llama a fetchData para recargar la lista
        clientName={clientInfo?.name}
        clientId={clientId} // <--- IMPORTANTE: Pasar el ID de la URL
      />      <DeviceModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} plantId={selectedPlant?.id} onSuccess={fetchData} />
      <ViewDevicesModal isOpen={isViewDevicesOpen} onClose={() => setIsViewDevicesOpen(false)} devices={devicesToView} />
    </div>
  );
};

/* =========================
    Sub-Componentes (Rows/Cards)
========================= */

const UserRow = ({ user }) => (
  <tr className="group hover:bg-slate-50/50 transition-colors">
    <td className="p-6 font-bold text-slate-800 text-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black italic border border-blue-200 shadow-sm">
          {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
        </div>
        <div>
          <p className="tracking-tight">{user.full_name}</p>
          <p className="text-[11px] text-slate-400 font-medium lowercase flex items-center gap-1">
            <Mail size={10} /> {user.email}
          </p>
        </div>
      </div>
    </td>
    <td className="p-6">
      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-black uppercase tracking-tight">
        {user.client_id ? 'Industrial Operator' : 'System Admin'}
      </span>
    </td>
    <td className="p-6">
      <div className={`flex items-center gap-2 font-bold text-[10px] uppercase italic ${user.is_active ? 'text-green-500' : 'text-slate-400'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
        {user.is_active ? 'Conectado' : 'Inactivo'}
      </div>
    </td>
    <td className="p-6 text-right">
      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
        <button className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
      </div>
    </td>
  </tr>
);

const PlantCard = ({ plant, onView, onAdd }) => (
  <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
          <Box size={30} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 italic tracking-tight">{plant.name}</h3>
          <p className="text-slate-400 flex items-center gap-1 text-xs font-bold uppercase tracking-tighter">
            <MapPin size={14} className="text-blue-500" /> {plant.city}
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={onView} className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
          Inventario <ArrowRight size={18} />
        </button>
        <button onClick={onAdd} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <Plus size={18} /> Instalar Equipo
        </button>
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-300 flex flex-col items-center">
    <div className="mb-4 opacity-20">{icon}</div>
    <p className="font-black italic text-xl uppercase tracking-widest text-slate-400">{title}</p>
    {subtitle && <p className="text-sm text-slate-400 max-w-xs mt-2">{subtitle}</p>}
  </div>
);

export default ClientDetail;