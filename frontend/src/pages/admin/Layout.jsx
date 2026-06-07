import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import Profile from '../customer/Profile';

function Layout() {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  // Fetch notifications from the backend API
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000); // 1 minute interval

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

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


  const pageTitle = (() => {
    if (location.pathname.startsWith('/booking') || location.pathname.startsWith('/book')) {
      return 'Booking Wizard';
    }
    if (location.pathname.startsWith('/history')) {
      return 'Booking History';
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
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:text-[#d4af37] transition duration-200"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>

                {/* Unread Yellow Dot */}
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>

              {/* Dropdown Pop-up */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#090d14] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  <div className="p-3.5 border-b border-white/5 flex justify-between items-center bg-[#0d131f]">
                    <span className="font-semibold text-xs uppercase tracking-wider text-slate-300">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} New
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">No notifications yet</div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif._id}
                          onClick={() => {
                            handleNotificationClick(notif._id);
                            setIsNotificationOpen(false);
                          }}
                          className={`w-full p-3.5 text-left transition-colors duration-150 block hover:bg-white/5 ${!notif.isRead ? 'bg-amber-500/[0.02]' : ''}`}
                        >
                          <p className={`text-xs font-semibold ${!notif.isRead ? 'text-amber-400' : 'text-slate-200'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-slate-600 block mt-2 tracking-wide">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Separator Line */}
            <div className="h-8 w-px bg-white mx-1"></div>

            {/* Profile Group Button (Avatar + Name) */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 text-left focus:outline-none group pl-1"
            >
              {/* Profile Avatar Image/Initial */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d4af37]/30 bg-[#d4af37]/15 text-sm font-bold text-[#d4af37] transition group-hover:border-[#d4af37]/60 group-hover:bg-[#d4af37]/25">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              
              {/* User Name Display */}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white tracking-tight group-hover:text-yellow-400 transition">
                  {user?.name || 'User'}
                </p>
              </div>
            </button>

          </div>
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