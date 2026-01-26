import { useAuth } from "../auth";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar navbar-light bg-white border-bottom shadow-sm px-4" style={{ height: '64px' }}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="text-muted fst-italic">
          Bienvenido, <span className="fw-bold text-dark">{user?.full_name || user?.name}</span>
        </div>
        
        <button
          onClick={logout}
          className="btn btn-sm btn-outline-danger px-3"
        >
          <i className="bi bi-box-arrow-right me-1"></i> Cerrar Sesión
        </button>
      </div>
    </header>
  );
}