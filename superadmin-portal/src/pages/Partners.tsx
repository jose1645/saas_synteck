import { useState, useEffect, useMemo } from "react";
import { partnerService, type Partner } from "../services/partnerService";
import api from "../api";
import PartnerModal from "../components/partners/PartnerModal";
import PartnerTable from "../components/partners/PartnerTable";

export default function Partners() {
  // --- ESTADOS ---
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // --- ESTADOS DE FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // --- OBTENCIÓN DE DATOS ---
  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      const data = await partnerService.getAll();
      setPartners(data);
    } catch (error) {
      console.error("Error al obtener partners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // --- LÓGICA DE FILTRADO ---
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = 
        filterCountry === "ALL" || p.extra_data?.country === filterCountry;
      
      const matchesStatus = 
        filterStatus === "ALL" || 
        (filterStatus === "ACTIVE" ? p.is_active : !p.is_active);

      return matchesSearch && matchesCountry && matchesStatus;
    });
  }, [partners, searchTerm, filterCountry, filterStatus]);

  // --- ACCIONES ---
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await partnerService.delete(id);
      } else {
        await api.patch(`/partners/${id}/activate`);
      }
      fetchPartners();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  /**
   * Acción para enviar invitación de acceso
   * Aquí conectarás con el endpoint que genera el JWT de invitación
   */
 const handleSendInvitation = async (partner: Partner) => {
    try {
      // Llamada al servicio que conecta con el endpoint POST /partners/{id}/invite
      await partnerService.sendInvitation(partner.id);
      
      alert(`✅ Invitación enviada con éxito.\n\nEl socio "${partner.name}" recibirá un correo en ${partner.email} para configurar su contraseña.`);
      
    } catch (error: any) {
      console.error("Error al enviar invitación:", error);
      const errorMsg = error.response?.data?.detail || "No se pudo conectar con el servidor de correo.";
      alert(`❌ Error: ${errorMsg}`);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCountry("ALL");
    setFilterStatus("ALL");
  };

  

  return (
    <div className="container-fluid py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Socios Comerciales</h2>
          <p className="text-muted small">Panel de administración de integradores y contratos.</p>
        </div>
        <button 
          className="btn btn-primary fw-bold shadow-sm" 
          data-bs-toggle="modal" 
          data-bs-target="#newPartnerModal"
        >
          <i className="bi bi-person-plus-fill me-2"></i>Nuevo Socio
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Búsqueda rápida</label>
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="Empresa o email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted">País</label>
              <select 
                className="form-select shadow-sm" 
                value={filterCountry} 
                onChange={(e) => setFilterCountry(e.target.value)}
              >
                <option value="ALL">Todos los países</option>
                <option value="MX">México 🇲🇽</option>
                <option value="EC">Ecuador 🇪🇨</option>
                <option value="US">USA 🇺🇸</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted">Estado</label>
              <select 
                className="form-select shadow-sm" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Cualquier estado</option>
                <option value="ACTIVE">Socios Activos</option>
                <option value="INACTIVE">Socios Inactivos</option>
              </select>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100 fw-bold shadow-sm" 
                onClick={clearFilters}
              >
                <i className="bi bi-eraser-fill me-2"></i>Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="card border-0 shadow-sm">
        <PartnerTable 
          partners={filteredPartners} 
          isLoading={isLoading} 
          onViewDetail={(p) => setSelectedPartner(p)} 
          onToggleStatus={handleToggleStatus}
          onSendInvitation={handleSendInvitation} // <--- Pasamos la nueva acción
        />
      </div>

      <PartnerModal onSave={fetchPartners} />

      {/* MODAL: EXPEDIENTE (DETALLES) */}
      <div className="modal fade" id="detailPartnerModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered shadow-lg">
          <div className="modal-content border-0">
            <div className="modal-header bg-dark text-white p-3">
              <h5 className="modal-title fw-bold">Expediente Comercial</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body p-4 bg-light">
              {selectedPartner && (
                <>
                  <div className="text-center mb-4">
                    <h4 className="fw-bold text-dark mb-0">{selectedPartner.name}</h4>
                    <span className="text-muted small">{selectedPartner.email}</span>
                  </div>

                  <h6 className="fw-bold text-primary mb-2 small text-uppercase">Acuerdos Legales</h6>
                  <div 
                    className="p-3 bg-white rounded border small mb-4 shadow-sm" 
                    style={{ whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}
                  >
                    {selectedPartner.extra_data?.commercial_conditions || "Sin términos específicos registrados."}
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <div className="p-2 bg-white rounded border small shadow-sm">
                        <strong className="text-muted tiny">ID Fiscal</strong> <br/>
                        {selectedPartner.extra_data?.tax_id || "N/A"}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-2 bg-white rounded border small shadow-sm">
                        <strong className="text-muted tiny">Divisa</strong> <br/>
                        {selectedPartner.extra_data?.currency || "USD"}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="p-2 bg-white rounded border small shadow-sm">
                        <strong className="text-muted tiny">Método de Pago</strong> <br/>
                        {selectedPartner.extra_data?.payment_method || "No definido"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer bg-light border-0">
              <button className="btn btn-secondary w-100 fw-bold" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}