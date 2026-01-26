export default function TrendWidget({ value, unit, data = [] }) {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-4xl font-black text-white">
          {value} <span className="text-sm text-slate-600 uppercase">{unit}</span>
        </h3>
        <span className="text-emerald-500 text-xs font-mono">+2.5% vs promedio</span>
      </div>
      
      {/* Visualización de tendencia */}
      <div className="flex-1 flex items-end gap-1.5 px-2 pb-1 min-h-[80px]">
        {data.map((h, i) => (
          <div 
            key={i} 
            style={{ height: `${h}%` }} 
            className="flex-1 bg-gradient-to-t from-[#00f2ff]/10 to-[#00f2ff]/40 rounded-t-sm border-t border-[#00f2ff]/30 hover:to-[#00f2ff] transition-all duration-300"
          />
        ))}
      </div>
    </div>
  );
}