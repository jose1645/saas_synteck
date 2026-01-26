import { useState } from "react";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("1. Formulario enviado");
    
    setError("");
    setIsLoading(true);

    try {
      console.log("2. Iniciando llamada a login() en el contexto...");
      await login(email, password);
      
      console.log("5. login() terminó con éxito. Intentando redirigir...");
      navigate("/dashboard");
      console.log("6. navigate() ejecutado.");
      
    } catch (err: any) {
      console.error("ERROR EN LOGIN:", err);
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light vh-100 d-flex align-items-center justify-content-center">
      <div className="card shadow border-0" style={{ maxWidth: "420px", width: "100%", borderRadius: "15px" }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-primary mb-1">Synteck</h2>
            <p className="text-muted small">Super Admin Portal</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small border-0" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">Correo Electrónico</label>
              <input
                type="email"
                className="form-control form-control-lg fs-6 shadow-none"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary">Contraseña</label>
              <input
                type="password"
                className="form-control form-control-lg fs-6 shadow-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Conectando...
                </>
              ) : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="#" className="text-decoration-none small text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}