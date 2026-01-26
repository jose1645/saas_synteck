import { Activity, AlertCircle } from 'lucide-react';

export default function StatusWidget({ status = 'active' }) {
  const isActive = status === 'active';
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className={`absolute inset-0 rounded-full blur-xl opacity-20 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {isActive ? <Activity className="text-emerald-500" /> : <AlertCircle className="text-red-500 animate-pulse" />}
      </div>
      <span className={`mt-4 text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isActive ? 'Sistema Nominal' : 'Falla Crítica'}
      </span>
    </div>
  );
}