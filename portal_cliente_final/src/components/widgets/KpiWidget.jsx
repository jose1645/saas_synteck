import { Radio } from 'lucide-react';

export default function KpiWidget({ value, unit, color = "text-[#00f2ff]" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-300">
      <h3 className={`text-6xl font-black ${color} tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(0,242,255,0.1)]`}>
        {value}
        <span className="text-xl ml-2 text-slate-600 font-light">{unit}</span>
      </h3>
      <div className="mt-4 flex items-center justify-center gap-2 text-[#00f2ff]/60">
        <Radio size={12} className="animate-pulse" />
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]">Live Data Stream</span>
      </div>
      <p className="text-[8px] font-mono text-slate-700 uppercase tracking-widest mt-2">
        Precisión: ±0.1 {unit}
      </p>
    </div>
  );
}