export default function Devices() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dispositivos IOT</h1>
      <div className="grid grid-cols-1 gap-2">
        <div className="p-4 border-l-4 border-yellow-400 bg-white shadow-sm">
          Sensor_01 - <span className="text-sm font-mono text-gray-500">MAC: AA:BB:CC:11:22</span>
        </div>
        <div className="p-4 border-l-4 border-green-400 bg-white shadow-sm">
          Gateway_Principal - <span className="text-sm font-mono text-gray-500">MAC: DD:EE:FF:33:44</span>
        </div>
      </div>
    </div>
  );
}