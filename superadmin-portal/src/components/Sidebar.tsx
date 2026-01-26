import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="bg-dark text-white shadow d-flex flex-column" style={{ width: '260px' }}>
      <div className="p-4 border-bottom border-secondary">
        <h4 className="fw-bold text-primary mb-0">SYNTECK</h4>
      </div>
      
      <div className="nav nav-pills flex-column p-3 gap-1">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/partners" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
          Socios
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
          Clientes
        </NavLink>
        <NavLink to="/devices" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
          Dispositivos
        </NavLink>
      </div>
    </div>
  );
}