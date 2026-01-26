import { createContext, useContext, useState, ReactNode } from "react";
import { authService, type LoginResponse } from "./services/authService";

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>; // Ahora es una Promesa
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string) => {
    try {
      const data: LoginResponse = await authService.login(email, password);

      // Guardamos tokens
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      } else {
        const fallbackUser = { email, full_name: "Usuario Synteck" };
        setUser(fallbackUser);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
      }
    } catch (error: any) {
      console.error("Error en login:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 1. Llamamos al servicio para invalidar en el Backend
      // Esto enviará el POST /auth/logout con el refresh_token
      await authService.logout();
    } catch (error) {
      console.error("Error al notificar logout al backend:", error);
    } finally {
      // 2. Limpieza de estado y storage pase lo que pase
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      // 3. Redirección limpia
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};