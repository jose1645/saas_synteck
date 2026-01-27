import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { NotificationContainer } from '../components/NotificationToast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const { user } = useAuth();
    const lastAlertsRef = useRef(new Set());
    const isFirstLoad = useRef(true);

    const addNotification = useCallback((message, type = 'warning') => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, message, type }]);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const fetchAlerts = useCallback(async () => {
        if (!user) return;

        try {
            const res = await api.get('/alerts/active');
            const activeAlerts = res.data;

            // Detectar nuevas alertas (que no estuvieran en el set anterior)
            const currentIds = new Set(activeAlerts.map(a => a.id));

            if (!isFirstLoad.current) {
                activeAlerts.forEach(alert => {
                    if (!lastAlertsRef.current.has(alert.id)) {
                        // ¡NUEVA ALERTA DETECTADA!
                        addNotification(
                            `${alert.title}: ${alert.message}`,
                            alert.severity.toLowerCase()
                        );
                    }
                });
            }

            lastAlertsRef.current = currentIds;
            isFirstLoad.current = false;
        } catch (err) {
            console.error("🔔 [Notification] Error fetching alerts:", err);
        }
    }, [user, addNotification]);

    useEffect(() => {
        if (user) {
            fetchAlerts();
            const interval = setInterval(fetchAlerts, 20000); // Cada 20s
            return () => clearInterval(interval);
        } else {
            lastAlertsRef.current = new Set();
            isFirstLoad.current = true;
            setNotifications([]);
        }
    }, [user, fetchAlerts]);

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <NotificationContainer
                notifications={notifications}
                removeNotification={removeNotification}
            />
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
