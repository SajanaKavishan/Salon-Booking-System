import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import Profile from '../customer/Profile';

function Layout() {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      setUser(event.detail || null);
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isProfileOpen]);

  const role = localStorage.getItem('userRole') || user?.role;

  if (!user || !['admin', 'staff', 'customer'].includes(role)) {
    return <Navigate to="/login" replace />;
  }

  const suiteLabel = role === 'admin'
    ? 'Management Suite'
    : role === 'staff'
      ? 'Staff Suite'
      : 'Customer Suite';
  const pageTitle = (() => {
    if (role !== 'customer') {
      return suiteLabel;
    }

    // Dashboard and root map to Customer Portal
    if (location.pathname === '/' || location.pathname.startsWith('/dashboard')) {
      return 'Customer Portal';
    }

    if (location.pathname.startsWith('/booking') || location.pathname.startsWith('/book')) {
      return 'Booking Wizard';
    }

    if (location.pathname.startsWith('/history')) {
      return 'Dossier History';
    }

    return 'Customer Portal';
  })();
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const closeProfile = () => setIsProfileOpen(false);

  return (
    <div className="min-h-screen w-full bg-[#07090d]">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      <div className="flex min-h-screen w-full flex-col md:pl-80">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between bg-[#090d14]/95 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#d4af37] transition hover:bg-white/10 hover:text-yellow-400 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white md:text-xl">{pageTitle}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 md:hidden">{suiteLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#d4af37]/30 bg-[#d4af37]/15 text-sm font-bold text-[#d4af37] transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/25"
            aria-label="Open profile"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
            ) : (
              userInitial
            )}
          </button>
        </header>

        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        <main className="w-full flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>

      {isProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md"
          onClick={closeProfile}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#070707] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Profile onClose={closeProfile} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
