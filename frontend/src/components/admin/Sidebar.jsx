import React from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuthStorage } from '../../utils/auth';

const adminSidebarItems = [
  {
    label: 'Dashboard',
    to: '/admin',
    end: true,
    icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z'
  },
  {
    label: 'Appointments',
    to: '/admin/appointments',
    icon: 'M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'
  },
  {
    label: 'Services',
    to: '/admin/services',
    icon: 'M7 8h10M7 12h10M7 16h6M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'
  },
  {
    label: 'Staff',
    to: '/admin/staff',
    icon: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v4M21 10h-4'
  },
  {
    label: 'Analytics',
    to: '/admin/analytics',
    icon: 'M5 19V9m7 10V5m7 14v-7M3 19h18'
  },
  {
    label: 'Settings',
    to: '/admin/settings',
    icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.1-1.1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.1-1.1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z'
  }
];

const staffSidebarItems = [
  {
    label: 'Dashboard',
    to: '/staff/dashboard',
    end: true,
    icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z'
  },
  {
    label: 'Appointments',
    to: '/staff/appointments',
    icon: 'M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'
  },
  {
    label: 'Roster & Shifts',
    to: '/staff/roster-shifts',
    icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'
  }
];

const customerSidebarItems = [
  {
    label: 'Overview',
    to: '/dashboard',
    end: true,
    icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z'
  },
  {
    label: 'Book Appointment',
    to: '/book',
    icon: 'M7 3v3M17 3v3M4.5 9h10.5M6 5h9a2 2 0 0 1 2 2v3M8 13h4M10 11v4M6 9h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z'
  },
  {
    label: 'Appointments Log',
    to: '/history',
    icon: 'M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'
  }
];

function Sidebar({ isOpen = false, onClose = () => { } }) {
  const navigate = useNavigate();
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('user'));
  } catch {
    storedUser = null;
  }

  const userRole = localStorage.getItem('userRole') || storedUser?.role;
  const sidebarItems = userRole === 'admin'
    ? adminSidebarItems
    : userRole === 'staff'
      ? staffSidebarItems
      : customerSidebarItems;
  const suiteLabel = userRole === 'admin'
    ? 'Management Suite'
    : userRole === 'staff'
      ? 'Staff Suite'
      : 'Customer Suite';
  const panelLabel = userRole === 'admin'
    ? 'Admin navigation'
    : userRole === 'staff'
      ? 'Staff navigation'
      : 'Customer navigation';

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/');
  };

  const handleNavigate = (to) => {
    onClose();
    navigate(to);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#0d1117] text-white shadow-2xl shadow-black/30 transition-transform duration-300 ease-out md:w-80 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      aria-label={panelLabel}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="px-6 pb-6 pt-8 md:px-8 md:pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37] md:h-14 md:w-14">
                <Scissors size={26} strokeWidth={2.1} />
              </div>
              <div>
                <h1 className="font-serif text-[1.7rem] font-semibold tracking-wide text-white md:text-[2rem] md:tracking-wider">
                  Salon<span className="text-[#D4AF37]">DEES</span>
                </h1>
                <p className="mt-2 text-sm uppercase tracking-widest text-neutral-500 md:text-base">{suiteLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 md:mt-12">
        
            <nav className="space-y-2 md:space-y-3.5">
              {sidebarItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-4 overflow-hidden rounded-xl px-4 py-3 text-base font-semibold tracking-widest transition-colors duration-300 md:gap-5 md:px-5 md:py-4 md:text-sm ${isActive
                      ? 'text-[#D4AF37]'
                      : 'text-neutral-400 hover:text-[#D4AF37]/60'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
                          transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-rail"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.45)]"
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      )}
                      <motion.svg
                        className="relative z-10 h-4 w-4 shrink-0 md:h-5 md:w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        whileHover={{ scale: isActive ? 1 : 1.12 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                      >
                        <path d={item.icon} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                      <span className="relative z-10">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-neutral-800 px-6 py-6 md:px-8 md:py-7">
          {userRole === 'admin' && (
            <motion.button
              type="button"
              onClick={() => handleNavigate('/admin/messages')}
              className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-base font-semibold tracking-widest text-neutral-400 transition-colors duration-300 hover:bg-white/5 hover:text-[#D4AF37]/60 md:gap-5 md:px-5 md:py-4 md:text-lg"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <motion.svg
                className="h-4 w-4 shrink-0 md:h-5 md:w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                whileHover={{ scale: 1.12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <path d="M4 5h16v11H7l-3 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
              Messages
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={handleLogout}
            className="group mt-3 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-base font-semibold tracking-widest text-neutral-400 transition-colors duration-300 hover:bg-white/5 hover:text-[#D4AF37]/60 md:gap-5 md:px-5 md:py-4 md:text-lg"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <motion.svg
              className="h-4 w-4 shrink-0 md:h-5 md:w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <path d="M15 17l5-5-5-5M20 12H8M11 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            Sign Out
          </motion.button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
