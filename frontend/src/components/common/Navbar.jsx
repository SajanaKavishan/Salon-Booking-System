import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthStorage } from '../../utils/auth';
import { storage } from '../../utils/storage';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = storage.get('userRole');
  const sectionScrollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (sectionScrollTimerRef.current) {
        window.clearTimeout(sectionScrollTimerRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/');
  };

  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname === '/onboarding' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/staff') ||
    location.pathname.startsWith('/customer') ||
    location.pathname === '/dashboard' ||
    location.pathname === '/profile' ||
    location.pathname === '/book' ||
    location.pathname === '/booking' ||
    location.pathname === '/history' ||
    location.pathname === '/rewards' ||
    location.pathname === '/settings'
  ) {
    return null;
  }

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      if (sectionScrollTimerRef.current) {
        window.clearTimeout(sectionScrollTimerRef.current);
      }

      sectionScrollTimerRef.current = window.setTimeout(() => {
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

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/60 px-3 py-3 font-sans shadow-lg backdrop-blur-md sm:px-6 sm:py-4 lg:px-12">
      <div className="relative z-20 flex w-full items-center justify-between gap-3 text-white sm:px-6 lg:px-12">
        <motion.button
          type="button"
          onClick={() => scrollToSection('home')}
          className="group flex min-w-0 shrink items-center gap-2 text-2xl font-serif tracking-[0.12em] text-white transition hover:text-[#d4af37] sm:text-3xl sm:tracking-widest"
        >
          <motion.div
            className="text-[#d4af37]"
            animate={{ rotate: 0 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Scissors className="h-6 w-6 sm:h-8 sm:w-8" />
          </motion.div>
          <span className="truncate whitespace-nowrap">
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
                className="flex-shrink-0 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] sm:hidden"
              >
                Sign In
              </Link>
            </>
          )}

          {userRole && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 transition duration-300 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 sm:px-5 sm:text-lg"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
