import React from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthStorage } from '../../utils/auth';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/');
  };

  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/staff') ||
    location.pathname === '/dashboard' ||
    location.pathname === '/profile' ||
    location.pathname === '/book' ||
    location.pathname === '/booking'
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

  const dashboardPath = userRole === 'admin'
    ? '/admin'
    : userRole === 'staff'
      ? '/staff/dashboard'
      : '/dashboard';

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/50 px-6 py-4 font-sans shadow-lg backdrop-blur-md lg:px-12">
      <div className="flex w-full items-center justify-between gap-4 px-4 text-white sm:px-6 lg:px-12">
        <motion.button
          type="button"
          onClick={() => scrollToSection('home')}
          className="group flex shrink-0 items-center gap-2 text-3xl font-serif tracking-widest text-white transition hover:text-[#d4af37]"
        >
          <motion.div
            className="text-[#d4af37]"
            animate={{ rotate: 0 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Scissors className="h-8 w-8" />
          </motion.div>
          <span className="whitespace-nowrap">
            Salon<span className="text-[#d4af37]">DEES</span>
          </span>
        </motion.button>

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

        <div className="ml-auto flex items-center gap-3 sm:gap-4 lg:ml-0">
          {!userRole && (
            <>
              <Link
                to="/login"
                className="hidden text-lg font-medium text-neutral-300 transition duration-300 hover:text-white sm:block"
              >
                Sign In
              </Link>
              <Link
                to="/booking"
                className="hidden rounded-full bg-gradient-to-r from-primary to-[#C9A227] px-3 py-1.5 text-xs font-medium text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] transition duration-300 hover:opacity-90 sm:block sm:px-6 sm:py-2.5 sm:text-sm"
              >
                Book Now
              </Link>
              <Link
                to="/login"
                className="flex-shrink-0 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] sm:hidden"
              >
                Sign In
              </Link>
            </>
          )}

          {userRole && (
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
