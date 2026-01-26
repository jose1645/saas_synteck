import { useState } from "react";
import { partnerService } from "../../services/partnerService";

interface PartnerModalProps {
  onSave: () => void; // Quitamos el (data: any) porque el modal se encarga de guardar
}

export default function PartnerModal({ onSave }: PartnerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    country: "MX",
    tax_id: "",
    currency: "MXN",
    payment_method: "Transferencia Internacional (SWIFT)",
    notes: "",
    commercial_conditions: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Estructuramos el objeto según lo que espera el Backend flexible
    const payload = {
      name: formData.name,
      email: formData.email,
      extra_data: {
        country: formData.country,
        tax_id: formData.tax_id,
        currency: formData.currency,
        payment_method: formData.payment_method,
        notes: formData.notes,
        commercial_conditions: formData.commercial_conditions
      }
    };

    try {
      // 1. HACEMOS EL POST REAL
      await partnerService.create(payload);
      
      // 2. NOTIFICAMOS AL PADRE PARA REFRESCAR LA TABLA (EL GET)
      onSave();

      // 3. CERRAR MODAL (Opcional: Limpiar formulario)
      const modalElement = document.getElementById('newPartnerModal');
      // @ts-ignore (Si no tienes los tipos de bootstrap instalados)
      const modal = window.bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
      
      // Limpiar campos para el siguiente registro
      setFormData({
        name: "", email: "", country: "MX", tax_id: "", 
        currency: "MXN", payment_method: "Transferencia Internacional (SWIFT)", 
        notes: "", commercial_conditions: ""
      });

    } catch (error) {
      console.error("Error al guardar el socio:", error);
      alert("Error al intentar registrar el socio comercial.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal fade" id="newPartnerModal" tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-centered shadow-lg">
        <div className="modal-content border-0">
          <div className="modal-header bg-primary text-white p-4">
            <div>
              <h5 className="modal-title fw-bold mb-0">Configuración de Nuevo Socio</h5>
              <small className="opacity-75">Defina los parámetros legales y comerciales del integrador.</small>
            </div>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 bg-light">
              <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">Datos Generales</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-7">
                  <label className="form-label small fw-bold">Nombre Legal de la Empresa</label>
                  <input 
                    type="text" className="form-control" required 
                    value={formData.name}
                    placeholder="Ej. Synteck Ecuador S.A."
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-bold">Email Administrativo</label>
                  <input 
                    type="email" className="form-control" required 
                    value={formData.email}
                    placeholder="admin@socio.com"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* ... Los selects y textareas se mantienen igual, solo agrega el value={formData.campo} ... */}
              
              <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">Localización e Impuestos</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">País</label>
                  <select className="form-select" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}>
                    <option value="MX">México 🇲🇽</option>
                    <option value="EC">Ecuador 🇪🇨</option>
                    <option value="US">USA 🇺🇸</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">ID Fiscal (RUC/RFC)</label>
                  <input type="text" className="form-control" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Divisa de Liquidación</label>
                  <select className="form-select" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}>
                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>

              <div className="col-12 mt-3">
                <label className="form-label small fw-bold text-danger">Condiciones Especiales y Cláusulas</label>
                <textarea 
                  className="form-control" rows={5} 
                  value={formData.commercial_conditions}
                  onChange={(e) => setFormData({...formData, commercial_conditions: e.target.value})}
                ></textarea>
              </div>
            </div>
            
            <div className="modal-footer bg-white p-3">
              <button type="button" className="btn btn-light border" data-bs-dismiss="modal" disabled={isSubmitting}>Cancelar</button>
              <button type="submit" className="btn btn-primary px-5 fw-bold shadow-sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                ) : "Finalizar Registro de Socio"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}