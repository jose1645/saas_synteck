import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Llamada al backend
      const response = await authService.login(email, password);
      
      // 2. Notificar a App.js para que actualice el estado global
      onLogin(response.user); 
      
      // 3. Navegar al dashboard del socio
      navigate('/partner');
    } catch (err) {
      // Manejo de errores (401, 403 de cuenta suspendida, etc.)
      const message = err.response?.data?.detail || "Error de credenciales o conexión";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Synteck IoT</h2>
            <p className="text-slate-500 text-center">Portal del Integrador - HMI Delta</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-sm text-red-700 font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Corporativo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><User size={18} /></span>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-700"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Lock size={18} /></span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Ingresar al Portal"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => window.open('https://wa.me/tu-numero', '_blank')}
              className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle size={18} /> Soporte Técnico / Pagos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;