import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const token = localStorage.getItem('token');
  const isLoggedIn = Boolean(user && token);
  const role = user?.role;
  const isCustomer = role === 'customer' || (!role && isLoggedIn);
  const isStaffOrAdmin = role === 'admin' || role === 'staff';
  const showPublicLinks = !isLoggedIn;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const publicLinks = [
    { label: 'Services', id: 'services' },
    { label: 'About', id: 'about' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Contact', id: 'contact' }
  ];

  const dashboardPath = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/dashboard';
  const dashboardLabel = role === 'admin' ? 'Admin' : role === 'staff' ? 'Staff' : 'Dashboard';
  const avatarLabel = (user?.name || role || 'A').trim().charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#111111]/95 px-4 py-4 font-sans shadow-lg backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => scrollToSection('home')}
          className="shrink-0 text-3xl font-bold tracking-widest text-white transition hover:text-[#f5deb3]"
        >
          Salon<span className="text-[#d4af37]">DEES</span>
        </button>

        {showPublicLinks && (
          <div className="hidden items-center gap-8 text-lg font-medium tracking-wide text-gray-300 lg:flex">
            {publicLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="transition duration-300 hover:text-[#d4af37]"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-4">
          {!isLoggedIn && (
            <>
              <Link
                to="/login"
                className="text-base font-medium text-gray-300 transition duration-300 hover:text-white sm:text-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-sm bg-[#d4af37] px-4 py-2 text-base font-semibold text-black transition duration-300 hover:bg-yellow-500 sm:px-5 sm:text-lg"
              >
                Sign Up
              </Link>
            </>
          )}

          {isCustomer && (
            <>
              <Link
                to={dashboardPath}
                className="hidden text-base font-medium text-gray-300 transition duration-300 hover:text-[#d4af37] sm:block sm:text-lg"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="hidden text-base font-medium text-gray-300 transition duration-300 hover:text-[#d4af37] sm:block sm:text-lg"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-base font-medium text-gray-300 transition duration-300 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 sm:px-5 sm:text-lg"
              >
                Logout
              </button>
            </>
          )}

          {isStaffOrAdmin && (
            <>
              <Link
                to={dashboardPath}
                className="hidden text-base font-medium text-gray-300 transition duration-300 hover:text-[#d4af37] sm:block sm:text-lg"
              >
                {dashboardLabel}
              </Link>
              <button
                type="button"
                aria-label="Notifications"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]/80 text-gray-300 transition duration-300 hover:border-[#d4af37]/50 hover:text-[#d4af37]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-sm font-semibold text-[#d4af37]">
                {avatarLabel}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
