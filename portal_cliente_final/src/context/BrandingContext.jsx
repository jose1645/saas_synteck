import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
    const { user, clientData } = useAuth();
    // 1. Inicializar desde LocalStorage si existe
    const [branding, setBranding] = useState(() => {
        const saved = localStorage.getItem('synteck_branding');
        return saved ? JSON.parse(saved) : {
            name: "Synteck IoT",
            logoUrl: "",
            theme: "dark"
        };
    });

    // Definición de Temas
    const themes = {
        dark: {
            '--bg-primary': '#05070a',
            '--bg-secondary': '#0b0f1a', // Cards
            '--bg-sidebar': '#0b0f1a',
            '--text-primary': '#ffffff',
            '--text-secondary': '#94a3b8', // slate-400
            '--border-color': '#1e293b', // slate-800
            '--accent-color': '#00f2ff', // Cyan
            '--accent-secondary': '#7000ff' // Purple
        },
        light: {
            '--bg-primary': '#f1f5f9', // slate-100
            '--bg-secondary': '#ffffff',
            '--bg-sidebar': '#ffffff',
            '--text-primary': '#0f172a', // slate-900
            '--text-secondary': '#64748b', // slate-500
            '--border-color': '#e2e8f0', // slate-200
            '--accent-color': '#2563eb', // blue-600
            '--accent-secondary': '#4f46e5' // indigo-600
        }
    };

    const applyTheme = (themeName) => {
        const theme = themes[themeName] || themes.dark;
        const root = document.documentElement;
        Object.keys(theme).forEach(key => {
            root.style.setProperty(key, theme[key]);
        });
    };

    // Efecto para aplicar tema inicial
    useEffect(() => {
        applyTheme(branding.theme);
    }, []);

    useEffect(() => {
        console.log("🎨 [Branding] Effect triggered. User:", user?.id);

        const fetchBranding = async () => {
            try {
                let partnerId = user?.partner_id || clientData?.partner_id;

                if (partnerId) {
                    console.log(`🎨 [Branding] Fetching for Partner ${partnerId}...`);
                    const res = await api.get(`/partners/${partnerId}`);
                    const extra = res.data.extra_data?.branding;

                    if (extra) {
                        const newBranding = {
                            name: res.data.name,
                            logoUrl: extra.logoUrl,
                            theme: extra.theme || 'dark'
                        };

                        // Solo actualizamos si cambiaron los datos para evitar re-renders
                        if (JSON.stringify(newBranding) !== JSON.stringify(branding)) {
                            console.log("🎨 [Branding] Updating & Persisting:", newBranding);
                            setBranding(newBranding);
                            localStorage.setItem('synteck_branding', JSON.stringify(newBranding));
                            applyTheme(newBranding.theme);
                        }
                    }
                }
            } catch (error) {
                console.error("❌ [Branding] Error fetching:", error);
                // No fallback to default on error, keep existing persistence if possible
            }
        };

        if (user || clientData) {
            fetchBranding();
        }
    }, [user, clientData]);

    return (
        <BrandingContext.Provider value={{ branding }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => useContext(BrandingContext);
