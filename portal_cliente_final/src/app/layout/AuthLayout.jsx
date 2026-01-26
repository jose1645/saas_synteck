import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    // Eliminamos el max-w-md y el fondo gris para que el Login mande
    <div className="w-full min-h-screen bg-[#05070a]">
      <Outlet />
    </div>
  );
}