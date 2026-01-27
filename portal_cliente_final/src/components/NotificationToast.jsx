import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Info, AlertCircle } from 'lucide-react';

export const NotificationToast = ({ message, type = 'warning', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        critical: 'bg-red-500/10 border-red-500 text-red-500 shadow-red-500/20',
        warning: 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-amber-500/20',
        info: 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-brand-accent/20'
    };

    const icons = {
        critical: <AlertCircle size={20} className="animate-pulse" />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className={`flex items-center gap-4 p-4 border-2 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full duration-300 pointer-events-auto min-w-[320px] mb-4 ${styles[type] || styles.warning}`}>
            <div className="shrink-0">
                {icons[type] || icons.warning}
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 m-0">Alerta de Sistema</p>
                <p className="text-xs font-bold leading-tight m-0 mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="hover:rotate-90 transition-transform">
                <X size={16} />
            </button>
        </div>
    );
};

export const NotificationContainer = ({ notifications, removeNotification }) => {
    return (
        <div className="fixed top-8 right-8 z-[9999] pointer-events-none flex flex-col items-end">
            {notifications.map(n => (
                <NotificationToast
                    key={n.id}
                    message={n.message}
                    type={n.type}
                    onClose={() => removeNotification(n.id)}
                />
            ))}
        </div>
    );
};
