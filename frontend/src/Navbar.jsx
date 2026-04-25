import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
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

  const dashboardPath = userRole === 'admin' ? '/admin' : '/staff/dashboard';

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

        <div className="flex items-center gap-3 sm:gap-4">
          {!userRole && (
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

          {(userRole === 'admin' || userRole === 'staff') && (
            <>
              <Link
                to={dashboardPath}
                className="rounded-md bg-[#d4af37] px-4 py-2 text-base font-semibold text-black transition duration-300 hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] sm:px-5 sm:text-lg"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-base font-medium text-gray-300 transition duration-300 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 sm:px-5 sm:text-lg"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
