import React, { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

const TimeRangeSelector = ({ selectedRange, onRangeChange, onCustomRangeChange }) => {
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const ranges = [
        { label: '6H', value: '6h' },
        { label: '24H', value: '24h' },
        { label: '7D', value: '7d' },
        { label: '30D', value: '30d' },
    ];

    const handleCustomApply = () => {
        if (startDate && endDate) {
            onCustomRangeChange(new Date(startDate), new Date(endDate));
            setIsCustomOpen(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex bg-brand-secondary rounded-xl p-1 border border-brand-border">
                {ranges.map((range) => {
                    const isActive = selectedRange === range.value;
                    return (
                        <button
                            key={range.value}
                            onClick={() => onRangeChange(range.value)}
                            className={`
                              relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                              ${isActive ? 'text-brand-textPrimary' : 'text-brand-textSecondary hover:text-brand-textPrimary'}
                            `}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-brand-accent/20 border border-brand-accent/40 rounded-lg shadow-sm -z-10" />
                            )}
                            {range.label}
                        </button>
                    );
                })}

                {/* Botón Custom */}
                <button
                    onClick={() => {
                        onRangeChange('custom');
                        setIsCustomOpen(true);
                    }}
                    className={`
                      relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1
                      ${selectedRange === 'custom' ? 'text-brand-accent bg-brand-accent/10 border border-brand-accent/30' : 'text-brand-textSecondary hover:text-brand-textPrimary'}
                    `}
                >
                    <Calendar size={12} /> Personalizado
                </button>
            </div>

            {/* Inputs de fecha para Custom */}
            {selectedRange === 'custom' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                    <input
                        type="datetime-local"
                        className="bg-brand-secondary border border-brand-border rounded-lg px-2 py-1 text-[10px] text-brand-textPrimary focus:border-brand-accent outline-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-brand-textSecondary"><ChevronRight size={12} /></span>
                    <input
                        type="datetime-local"
                        className="bg-brand-secondary border border-brand-border rounded-lg px-2 py-1 text-[10px] text-brand-textPrimary focus:border-brand-accent outline-none"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <button
                        onClick={handleCustomApply}
                        className="bg-brand-accent text-brand-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:brightness-110 transition-colors"
                        disabled={!startDate || !endDate}
                    >
                        Go
                    </button>
                </div>
            )}
        </div>
    );
};

export default TimeRangeSelector;
