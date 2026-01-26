import React, { useState } from 'react';
import {
  User,
  Building,
  Key,
  Bell,
  Shield,
  Save,
  Copy,
  CheckCircle2,
  Globe,
  Mail,
  Loader2
} from 'lucide-react';
import { partnerService } from '../../services/partnerService';

const SettingsPage = ({ user }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');
  const [saving, setSaving] = useState(false);

  // State for Branding
  const [branding, setBranding] = useState({
    companyName: '',
    logoUrl: '',
    theme: 'dark'
  });

  // Load existing profile on mount or tab switch
  React.useEffect(() => {
    if (activeTab === 'empresa') {
      partnerService.getMyProfile()
        .then(data => {
          setBranding({
            companyName: data.name,
            logoUrl: data.extra_data?.branding?.logoUrl || '',
            theme: data.extra_data?.branding?.theme || 'dark'
          });
        })
        .catch(err => console.error("Error loading profile:", err));
    }
  }, [activeTab]);

  // Simulación de API Key del Integrador
  const apiKey = "sk_live_51Mxxxxxxxxxxxxxxxxx";

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveBranding = async () => {
    try {
      setSaving(true);
      const payload = {
        name: branding.companyName,
        email: user?.partner?.email, // Mantenemos el email si es requerido
        extra_data: {
          branding: {
            logoUrl: branding.logoUrl,
            theme: branding.theme
          }
        }
      };

      await partnerService.updateMyProfile(payload);
      alert("Configuración de marca actualizada correctamente.");
    } catch (error) {
      console.error("Error saving branding:", error);
      alert("Error guardando cambios.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Mi Perfil', icon: User },
    { id: 'empresa', label: 'Datos de Integrador', icon: Building },
    { id: 'seguridad', label: 'API & Seguridad', icon: Key },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500">Gestiona tu identidad de partner y credenciales de acceso</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navegación Lateral de Ajustes */}
        <aside className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Contenido Dinámico */}
        <div className="flex-1 space-y-6">

          {activeTab === 'perfil' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Información Personal</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre Completo</label>
                    <input type="text" defaultValue={user?.full_name || "Usuario"} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Correo Electrónico</label>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic">
                      <Mail size={16} /> {user?.email}
                    </div>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Perfil de Empresa (White Label)</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre Comercial</label>
                    <input
                      type="text"
                      value={branding.companyName || ''}
                      onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Logo URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={branding.logoUrl || ''}
                      onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-4">Tema del Portal Cliente</label>
                  <div className="flex gap-4">
                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex-1 flex flex-col items-center gap-3 transition-all ${branding.theme === 'dark' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={branding.theme === 'dark'}
                        onChange={() => setBranding({ ...branding, theme: 'dark' })}
                        className="sr-only"
                      />
                      <div className="w-full h-20 bg-[#0b0f1a] rounded-lg shadow-inner flex items-center justify-center border border-slate-700">
                        <span className="text-[#00f2ff] font-bold text-xs">CYBERPUNK</span>
                      </div>
                      <span className={`font-bold text-sm ${branding.theme === 'dark' ? 'text-blue-600' : 'text-slate-500'}`}>Oscuro (Default)</span>
                    </label>

                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex-1 flex flex-col items-center gap-3 transition-all ${branding.theme === 'light' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={branding.theme === 'light'}
                        onChange={() => setBranding({ ...branding, theme: 'light' })}
                        className="sr-only"
                      />
                      <div className="w-full h-20 bg-white rounded-lg shadow-inner flex items-center justify-center border border-slate-200">
                        <span className="text-slate-800 font-bold text-xs">CORPORATE</span>
                      </div>
                      <span className={`font-bold text-sm ${branding.theme === 'light' ? 'text-blue-600' : 'text-slate-500'}`}>Claro (Blanco)</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end">
                  <button
                    onClick={saveBranding}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Credenciales de API</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">PRO ACCOUNT</span>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-500 mb-4">Usa esta clave para autenticar tus dispositivos o servicios externos con la nube de Synteck IoT.</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <code className="flex-1 text-blue-400 font-mono text-sm truncate">{apiKey}</code>
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                    >
                      {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <h3 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                  <Shield size={18} /> Zona de Peligro
                </h3>
                <p className="text-sm text-red-600 mb-4">Al regenerar tu API Key, todos tus dispositivos actuales perderán la conexión hasta que sean actualizados.</p>
                <button className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition-all">
                  Regenerar API Key
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;