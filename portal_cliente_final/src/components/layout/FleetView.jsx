import { Activity, Zap, Thermometer, Wifi } from 'lucide-react';

const FleetView = () => {
  const assets = [
    { id: 'HMI-01', name: 'Compresor Principal', status: 'online', kw: '2.12', temp: '42', v: '115.2' },
    { id: 'HMI-02', name: 'Línea de Empaque', status: 'offline', kw: '0.00', temp: '--', v: '--' },
    { id: 'HMI-03', name: 'Subestación Sur', status: 'online', kw: '14.5', temp: '38', v: '228.4' },
    { id: 'HMI-04', name: 'Bomba de Agua', status: 'online', kw: '1.05', temp: '35', v: '114.8' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {assets.map((asset) => (
        <div key={asset.id} className="bg-brand-secondary border border-brand-border rounded-xl p-5 hover:border-brand-accent/50 transition-all cursor-pointer group shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-2 rounded-lg ${asset.status === 'online' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-sidebar text-brand-textSecondary'}`}>
              <Zap size={20} fill={asset.status === 'online' ? "currentColor" : "none"} />
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${asset.status === 'online' ? 'text-green-500' : 'text-brand-textSecondary'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${asset.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-brand-textSecondary'}`} />
              {asset.status}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-brand-textPrimary font-semibold text-lg leading-tight group-hover:text-brand-accent transition-colors">{asset.name}</h3>
            <p className="text-brand-textSecondary text-xs mt-1 font-mono">{asset.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-brand-border pt-4">
            <div>
              <p className="text-[10px] text-brand-textSecondary uppercase font-bold mb-1">Potencia</p>
              <p className="text-brand-textPrimary font-mono text-base">{asset.kw} <span className="text-[10px] text-brand-textSecondary">kW</span></p>
            </div>
            <div>
              <p className="text-[10px] text-brand-textSecondary uppercase font-bold mb-1">Voltaje</p>
              <p className="text-brand-textPrimary font-mono text-base">{asset.v} <span className="text-[10px] text-brand-textSecondary">V</span></p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FleetView;