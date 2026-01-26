import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import { statsService, type DashboardData } from "../services/statsService";
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const result = await statsService.getSummary();
        setData(result);
      } catch (error) {
        console.error("Error al conectar con la API de stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">Panel de Control</h2>
        <p className="text-muted small">Bienvenido, {user?.full_name} ({user?.partner_id ? 'Integrador' : 'SuperAdmin'})</p>
      </div>

      <div className="row g-4 mb-4">
        {/* Card Socios - Solo relevante para SuperAdmin */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 border-start border-primary border-5">
            <h6 className="text-muted small fw-bold uppercase">Socios</h6>
            <h2 className="fw-bold">{data?.partners_count}</h2>
          </div>
        </div>

        {/* Card Clientes */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 border-start border-success border-5">
            <h6 className="text-muted small fw-bold uppercase">Clientes</h6>
            <h2 className="fw-bold">{data?.clients_count}</h2>
          </div>
        </div>

        {/* Card Dispositivos Online */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 border-start border-info border-5">
            <h6 className="text-muted small fw-bold uppercase">Devices Online</h6>
            <h2 className="fw-bold">{data?.devices_online}</h2>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-bold">Dispositivos Recientes</div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Nombre</th>
                <th>Protocolo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_devices.map(device => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td><span className="badge bg-light text-dark">{device.protocol}</span></td>
                  <td>
                    <span className={`badge ${device.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {device.is_active ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}