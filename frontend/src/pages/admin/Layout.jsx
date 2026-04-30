import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';

function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const role = localStorage.getItem('userRole') || user?.role;

  if (!user || !['admin', 'staff', 'customer'].includes(role)) {
    return <Navigate to="/login" replace />;
  }

  const suiteLabel = role === 'admin'
    ? 'Management Suite'
    : role === 'staff'
      ? 'Staff Suite'
      : 'Customer Suite';

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[url('/registerBg.jpg')] bg-cover bg-center bg-no-repeat md:bg-fixed">
      <div className="absolute inset-0 bg-black/60"></div>
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#090909]/85 px-4 py-3 backdrop-blur-md md:hidden">
          <div>
            <p className="text-xl font-bold tracking-tight text-white">
              Salon<span className="text-[#d4af37]">DEES</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{suiteLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d4af37] transition hover:bg-white/10 hover:text-yellow-400"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </header>

        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 cursor-default bg-black/55 md:hidden"
          />
        )}

        <main className="relative z-10 w-full flex-1 overflow-y-auto p-4 md:p-6 md:pl-[354px] lg:p-8">
          <div className="min-h-[calc(100vh-5rem)] rounded-2xl border border-white/10 bg-black/25 p-4 shadow-xl backdrop-blur-sm md:min-h-[calc(100vh-3rem)] md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
