import React from 'react';
import { X } from 'lucide-react';
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
    label: 'My Profile',
    to: '/staff/profile',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 1 1 16 0'
  }
];

const customerSidebarItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    end: true,
    icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z'
  },
  {
    label: 'Book Appointment',
    to: '/book',
    icon: 'M12 5v14M5 12h14'
  },
  {
    label: 'My Profile',
    to: '/profile',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 1 1 16 0'
  }
];

function Sidebar({ isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
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
    navigate('/login');
  };

  const handleNavigate = (to) => {
    onClose();
    navigate(to);
  };

  const shellClassName = [
    'fixed inset-y-0 left-0 z-30 flex w-[290px] flex-col border-r border-white/10 bg-[#090909]/95 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out md:w-[314px]',
    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    'md:flex'
  ].join(' ');

  return (
    <aside className={shellClassName} aria-label={panelLabel}>
      <div className="flex items-start justify-between gap-4 px-5 py-5 md:px-6 md:py-9">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Salon<span className="text-[#d4af37]">DEES</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 md:text-base">{suiteLabel}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#d4af37] transition hover:bg-white/10 hover:text-yellow-400 md:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-2 border-t border-white/5 px-3 py-4 md:space-y-3 md:py-5">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            onClick={() => onClose()}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-lg px-4 py-3 text-base font-semibold transition md:px-5 md:py-4 md:text-lg ${
                isActive
                  ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/25'
                  : 'text-slate-300 hover:bg-white/10 hover:text-[#d4af37]'
              }`
            }
          >
            <svg className="h-5 w-5 shrink-0 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={item.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-4 md:space-y-3 md:py-6">
        {userRole === 'admin' && (
          <button
            type="button"
            onClick={() => handleNavigate('/admin/messages')}
            className="salon-button-ghost w-full justify-start gap-4 px-4 py-3 text-left text-base md:px-5 md:py-4 md:text-lg"
          >
            <svg className="h-5 w-5 shrink-0 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 5h16v11H7l-3 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Messages
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="salon-button-ghost w-full justify-start gap-4 px-4 py-3 text-left text-base md:px-5 md:py-4 md:text-lg"
        >
          <svg className="h-5 w-5 shrink-0 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 17l5-5-5-5M20 12H8M11 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
