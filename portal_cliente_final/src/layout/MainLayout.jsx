import { Outlet } from 'react-router-dom'; // <--- Importante
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout() { // Ya no necesita {children}
  return (
    <div className="flex min-h-screen bg-brand-primary text-brand-textPrimary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet /> {/* <--- Aquí se renderizará el Dashboard */}
        </main>
      </div>
    </div>
  );
}