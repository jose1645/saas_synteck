import { useState } from 'react';
import { Zap, UserRound, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export default function Login() {
  // Estados para el formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { branding } = useBranding();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Verificación de campos vacíos
    if (!email.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    // 2. Verificación de formato de correo (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Intento de conexión con el backend de FastAPI
      await login(email, password);
    } catch (err) {
      // Manejo de errores de credenciales o servidor
      setError('Credenciales inválidas o error de conexión con el nodo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center p-6 relative overflow-hidden font-sans text-brand-textPrimary">
      {/* Luces de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-accentSec/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm z-10">
        {/* Cabecera */}
        <div className="flex flex-col items-center mb-12">
          {branding?.logoUrl ? (
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-accent blur-xl opacity-20 animate-pulse"></div>
              <img src={branding.logoUrl} alt={branding.name} className="h-16 object-contain relative" />
            </div>
          ) : (
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-accent blur-xl opacity-20 animate-pulse"></div>
              <Zap size={64} className="text-brand-accent relative fill-brand-accent/10" />
            </div>
          )}
          <h1 className="text-4xl font-black text-brand-textPrimary tracking-tighter uppercase text-center leading-none">
            {(branding.name || 'SYNTECK')} SA <span className="text-brand-textSecondary font-light">OS</span>
          </h1>
        </div>

        {/* Tarjeta de Login */}
        <div className="bg-brand-secondary/80 backdrop-blur-md border border-brand-accent/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-brand-textPrimary flex items-center gap-2">
              <ShieldCheck size={20} className="text-brand-accent" /> Autenticación
            </h2>
            <p className="text-brand-textSecondary text-xs mt-1">Acceso restringido a personal autorizado</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Campo Usuario (Email) */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-brand-textSecondary uppercase tracking-widest ml-1">Email de Acceso</label>
              <div className="relative group">
                <UserRound className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-500' : 'text-brand-textSecondary group-focus-within:text-brand-accent'}`} size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@synteck.mx"
                  className={`w-full bg-brand-primary border rounded-lg py-3.5 pl-10 pr-4 text-brand-textPrimary placeholder:text-brand-textSecondary text-xs font-mono focus:outline-none transition-all ${error ? 'border-red-500/50 focus:ring-1 focus:ring-red-500' : 'border-brand-border focus:ring-1 focus:ring-brand-accent focus:border-brand-accent'}`}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-brand-textSecondary uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-500' : 'text-brand-textSecondary group-focus-within:text-brand-accent'}`} size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-brand-primary border rounded-lg py-3.5 pl-10 pr-4 text-brand-textPrimary placeholder:text-brand-textSecondary text-xs font-mono focus:outline-none transition-all ${error ? 'border-red-500/50 focus:ring-1 focus:ring-red-500' : 'border-brand-border focus:ring-1 focus:ring-brand-accent focus:border-brand-accent'}`}
                />
              </div>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] p-2 rounded text-center font-bold animate-shake">
                {error.toUpperCase()}
              </div>
            )}

            {/* Botón de Acción */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-2 font-black py-4 rounded-lg transition-all active:scale-[0.98] uppercase tracking-widest text-xs mt-4 
                ${isSubmitting
                  ? 'bg-brand-sidebar text-brand-textSecondary cursor-not-allowed'
                  : 'bg-brand-accent hover:brightness-110 text-brand-primary shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Estableciendo Enlace...
                </>
              ) : (
                'Iniciar Conexión'
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-brand-border/50 text-center">
            <p className="text-[10px] text-brand-textSecondary font-bold uppercase tracking-tight">Soporte: tech-support@synteck.mx</p>
          </div>
        </div>
      </div>
    </div>
  );
}