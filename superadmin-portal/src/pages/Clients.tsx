export default function Clients() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Directorio de Clientes</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border-t">Juan Pérez</td>
              <td className="p-3 border-t text-green-600">Activo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}