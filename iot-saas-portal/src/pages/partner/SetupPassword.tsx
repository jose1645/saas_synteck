import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setupService } from "../../services/setupService";

export default function SetupPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: false });

  const handleActivate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setStatus({ ...status, error: "Las contraseñas no coinciden." });
    }

    setStatus({ ...status, loading: true, error: "" });
    try {
      await setupService.completeSetup({ token, email, password });
      setStatus({ loading: false, error: "", success: true });
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al activar la cuenta.";
      setStatus({ loading: false, error: msg, success: false });
    }
  };

  if (!token || !email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="p-6 bg-red-100 text-red-700 border border-red-200 rounded-lg shadow-sm">
          Enlace de activación inválido o incompleto.
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-800">Activar Cuenta</h3>
          <p className="text-slate-500 text-sm mt-2">Configura tu contraseña para acceder al portal.</p>
        </div>
        
        {status.success ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-100 text-center animate-pulse">
            ¡Cuenta activada! Redirigiendo al inicio de sesión...
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed outline-none" 
                value={email} 
                readOnly 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nueva Contraseña</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                required 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Contraseña</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                required 
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>

            {status.error && (
              <div className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded border border-red-100 text-center">
                {status.error}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={status.loading}
            >
              {status.loading ? "Procesando..." : "Establecer Contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}