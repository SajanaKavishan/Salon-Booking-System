import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const sidebarItems = [
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
    label: 'Clients',
    to: '/admin/clients',
    icon: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 19c0-1.8-1.2-3.3-2.8-3.8'
  },
  {
    label: 'Staff',
    to: '/admin/staff',
    icon: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v4M21 10h-4'
  },
  {
    label: 'Services',
    to: '/admin/services',
    icon: 'M7 8h10M7 12h10M7 16h6M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'
  }
];

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[314px] flex-col border-r border-white/10 bg-[#090909]/90 text-white shadow-2xl backdrop-blur-md lg:flex">
      <div className="px-6 py-9">
        <h1 className="text-4xl font-bold tracking-tight">
          Salon<span className="text-[#d4af37]">DEES</span>
        </h1>
        <p className="mt-2 text-base text-slate-400">Management Suite</p>
      </div>

      <nav className="flex-1 space-y-3 border-t border-white/5 px-3 py-5">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-lg px-5 py-4 text-lg font-semibold transition ${
                isActive
                  ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/25'
                  : 'text-slate-300 hover:bg-white/10 hover:text-[#d4af37]'
              }`
            }
          >
            <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={item.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-3 py-6">
        <button
          type="button"
          onClick={() => navigate('/admin/messages')}
          className="salon-button-ghost w-full justify-start gap-4 px-5 py-4 text-left text-lg"
        >
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5h16v11H7l-3 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Messages
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="salon-button-ghost w-full justify-start gap-4 px-5 py-4 text-left text-lg"
        >
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 17l5-5-5-5M20 12H8M11 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
