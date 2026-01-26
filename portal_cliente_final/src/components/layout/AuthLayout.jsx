import { Outlet } from 'react-router-dom';

/**
 * AuthLayout: Contenedor para Login y vistas de autenticación.
 * Asegura que el fondo sea negro industrial y ocupe toda la pantalla.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-brand-primary flex flex-col items-center justify-center relative overflow-hidden">

      {/* Luces de ambiente sutiles para que el fondo no sea plano */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-accentSec/5 rounded-full blur-[120px]" />
      </div>

      {/* Aquí es donde React Router inyectará el componente de Login */}
      <div className="w-full z-10">
        <Outlet />
      </div>

      {/* Footer minimalista opcional */}
      <footer className="absolute bottom-6 text-center w-full z-10">
        <p className="text-[10px] text-brand-textSecondary font-mono tracking-[0.2em] uppercase">
          Synteck Security Protocol // Encrypted Connection
        </p>
      </footer>
    </div>
  );
}