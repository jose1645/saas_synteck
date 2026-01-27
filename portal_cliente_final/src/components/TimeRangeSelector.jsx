import React, { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

const TimeRangeSelector = ({ selectedRange, onRangeChange, onCustomRangeChange }) => {
    const [wizardStep, setWizardStep] = useState(0); // 0: Start, 1: End
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isApplied, setIsApplied] = useState(false);
    const startInputRef = React.useRef(null);
    const endInputRef = React.useRef(null);
    const lastStepRef = React.useRef(-1);

    const ranges = [
        { label: '6H', value: '6h' },
        { label: '24H', value: '24h' },
        { label: '7D', value: '7d' },
        { label: '30D', value: '30d' },
    ];

    // Disparar el picker SOLO UNA VEZ al entrar en cada paso
    React.useEffect(() => {
        if (selectedRange === 'custom' && !isApplied && wizardStep !== lastStepRef.current) {
            lastStepRef.current = wizardStep;
            const timer = setTimeout(() => {
                try {
                    if (wizardStep === 0 && startInputRef.current) {
                        startInputRef.current.showPicker?.();
                    } else if (wizardStep === 1 && endInputRef.current) {
                        endInputRef.current.showPicker?.();
                    }
                } catch (e) {
                    console.warn("showPicker error", e);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [wizardStep, selectedRange, isApplied]);

    const handleCustomApply = () => {
        if (startDate && endDate) {
            onCustomRangeChange(new Date(startDate), new Date(endDate));
            setIsApplied(true);
        }
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '...';
        const d = new Date(dateStr);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
                <div className="flex bg-[#0d1117] rounded-2xl p-1.5 border border-brand-border/40 shadow-xl">
                    {ranges.map((range) => {
                        const isActive = selectedRange === range.value;
                        return (
                            <button
                                key={range.value}
                                onClick={() => {
                                    onRangeChange(range.value);
                                    setWizardStep(0);
                                    setIsApplied(false);
                                    lastStepRef.current = -1;
                                }}
                                className={`
                                  relative px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
                                  ${isActive ? 'text-brand-accent bg-brand-accent/5 border border-brand-accent/20' : 'text-brand-textSecondary hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {range.label}
                            </button>
                        );
                    })}

                    <div className="relative flex items-center ml-2 border-l border-brand-border/20 pl-2">
                        <button
                            onClick={() => {
                                onRangeChange('custom');
                                setWizardStep(0);
                                setIsApplied(false);
                                lastStepRef.current = -1;
                            }}
                            className={`
                              p-2.5 rounded-xl transition-all duration-500 flex items-center justify-center
                              ${selectedRange === 'custom' ? 'bg-brand-accent text-black shadow-[0_0_25px_rgba(0,242,255,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}
                            `}
                            title="Selector Personalizado"
                        >
                            <Calendar size={22} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {/* WIZARD O RESUMEN */}
                {selectedRange === 'custom' && (
                    <div className="flex items-center gap-4 bg-[#0a0a0c] border border-brand-accent/30 rounded-2xl px-5 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-500 min-w-[340px]">
                        {!isApplied ? (
                            wizardStep === 0 ? (
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1">Paso 1: Fecha Inicio</span>
                                        <input
                                            ref={startInputRef}
                                            type="datetime-local"
                                            className="bg-transparent border-none text-[13px] text-white font-bold outline-none cursor-pointer"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            onClick={(e) => e.target.showPicker?.()}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setWizardStep(1)}
                                        disabled={!startDate}
                                        className="bg-brand-accent/10 hover:bg-brand-accent hover:text-black p-2 rounded-xl transition-all disabled:opacity-5"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between w-full gap-4">
                                    <button
                                        onClick={() => setWizardStep(0)}
                                        className="text-brand-textSecondary hover:text-white p-1 transition-all"
                                    >
                                        <ChevronRight size={20} className="rotate-180" />
                                    </button>
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1">Paso 2: Fecha Fin</span>
                                        <input
                                            ref={endInputRef}
                                            type="datetime-local"
                                            className="bg-transparent border-none text-[13px] text-white font-bold outline-none cursor-pointer"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            onClick={(e) => e.target.showPicker?.()}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        className="bg-brand-accent text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)] disabled:opacity-20"
                                        disabled={!endDate}
                                    >
                                        Aplicar Rango
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-brand-accent/60 uppercase tracking-widest">Periodo Activo</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-black text-white">{formatDateShort(startDate)}</span>
                                        <span className="text-white/30 truncate">→</span>
                                        <span className="text-[11px] font-black text-white">{formatDateShort(endDate)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsApplied(false);
                                        setWizardStep(0);
                                        lastStepRef.current = -1;
                                    }}
                                    className="ml-4 px-3 py-1.5 bg-white/5 hover:bg-brand-accent hover:text-black rounded-lg border border-white/10 transition-all text-[9px] font-black uppercase tracking-tighter"
                                >
                                    Editar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeRangeSelector;
