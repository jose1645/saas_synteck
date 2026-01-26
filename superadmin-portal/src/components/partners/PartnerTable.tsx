import React from "react";
import type { Partner } from "../../services/partnerService";

interface PartnerTableProps {
  partners: Partner[];
  isLoading: boolean;
  onViewDetail: (partner: Partner) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onSendInvitation: (partner: Partner) => void;
}

export default function PartnerTable({ 
  partners, 
  isLoading, 
  onViewDetail, 
  onToggleStatus,
  onSendInvitation 
}: PartnerTableProps) {
  
  if (isLoading) {
    return (
      <div className="text-center py-5 card border-0 shadow-sm">
        <div className="spinner-border text-primary mb-2" role="status"></div>
        <p className="text-muted small">Cargando catálogo de socios...</p>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-secondary small text-uppercase">
              <tr>
                <th className="px-4 py-3">Socio / Empresa</th>
                <th className="py-3">Estatus Admin</th>
                <th className="py-3">Acceso Mail</th>
                <th className="text-end px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const isEmailVerified = p.user?.is_verified === true;
                const isActive = p.is_active;

                return (
                  <tr key={p.id} className={!isActive ? "table-light opacity-75" : ""}>
                    <td className="px-4">
                      <div className={`fw-bold ${!isActive ? 'text-muted' : 'text-dark'}`}>
                        {!isActive && <i className="bi bi-lock-fill me-2 text-danger"></i>}
                        {p.name}
                      </div>
                      <div className="text-muted small">{p.email}</div>
                    </td>
                    
                    {/* ESTATUS ADMIN (Aquí es donde se ve si pagaron o no) */}
                    <td>
                      {isActive ? (
                        <span className="badge bg-success-subtle text-success border-0">
                          <i className="bi bi-check-circle-fill me-1"></i> Activo
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border-0">
                          <i className="bi bi-x-circle-fill me-1"></i> Suspendido
                        </span>
                      )}
                    </td>

                    {/* ACCESO MAIL */}
                    <td>
                      {isEmailVerified ? (
                        <span className="text-info small fw-bold">
                          <i className="bi bi-patch-check-fill me-1"></i>Verificado
                        </span>
                      ) : (
                        <span className="text-warning small fw-bold">
                          <i className="bi bi-clock-history me-1"></i>Pendiente
                        </span>
                      )}
                    </td>

                    <td className="text-end px-4">
                      <div className="btn-group shadow-sm">
                        <button 
                          className="btn btn-sm btn-outline-secondary" 
                          onClick={() => onViewDetail(p)}
                          title="Ver detalle"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        
                        {/* Invitación: Solo si está activo y no verificado */}
                        {isActive && !isEmailVerified && (
                          <button 
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => onSendInvitation(p)}
                            title="Reenviar acceso"
                          >
                            <i className="bi bi-send-plus"></i>
                          </button>
                        )}

                        {/* EL BOTÓN DEL "CORTA CORRIENTE" */}
                        <button 
                          className={`btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => {
                            const action = isActive ? "SUSPENDER" : "REACTIVAR";
                            if(window.confirm(`¿Estás seguro de que deseas ${action} a ${p.name}?`)) {
                              onToggleStatus(p.id, isActive);
                            }
                          }}
                          title={isActive ? "Suspender cuenta (No pagó)" : "Reactivar cuenta (Ya pagó)"}
                        >
                          <i className={`bi ${isActive ? 'bi-person-dash-fill' : 'bi-person-check-fill'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}