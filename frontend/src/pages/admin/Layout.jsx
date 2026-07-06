import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';
import RoleProfile from '../shared/RoleProfile';
import API_BASE_URL from '../../utils/apiConfig';
import { getStoredSession } from '../../utils/auth';

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return 'Just now';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
};

const isEmergencyRescheduleNotification = (notification) => (
  notification?.type === 'RESCHEDULE_REQUIRED'
  || notification?.meta?.emergencyReschedule === true
);

const getEmergencyRescheduleMessage = (message) => (
  String(message || 'Your stylist had an emergency leave.')
    .replace(/\s*Please reschedule your booking\.?\s*$/i, '')
    .trim()
);

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileDialogRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [acknowledgedUnreadCount, setAcknowledgedUnreadCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [user, setUser] = useState(() => {
    return getStoredSession()?.user || null;
  });
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);

  // Fetch notifications from the backend API
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
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
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // 1 minute interval

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const shouldShowNotificationDot = unreadCount > acknowledgedUnreadCount && !isNotificationOpen;

  useEffect(() => {
    if (unreadCount >= acknowledgedUnreadCount) return undefined;

    const timeoutId = window.setTimeout(() => {
      setAcknowledgedUnreadCount(unreadCount);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [acknowledgedUnreadCount, unreadCount]);

  const handleNotificationBellClick = () => {
    setIsNotificationOpen((currentIsOpen) => {
      const nextIsOpen = !currentIsOpen;

      if (nextIsOpen) {
        setAcknowledgedUnreadCount(unreadCount);
      }

      return nextIsOpen;
    });
  };

  const markNotificationAsRead = async (notification) => {
    if (!notification?._id || notification.isRead) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleRescheduleLinkClick = async (event, notification) => {
    event.stopPropagation();

    await markNotificationAsRead(notification);
    setIsNotificationOpen(false);

    const meta = notification.meta || {};

    navigate('/book', {
      state: {
        emergencyReschedule: true,
        isReschedule: true,
        originalServices: meta.originalServices || meta.services || [],
        stylistId: meta.stylistId || meta.staffId || meta.stylist || '',
        staffId: meta.staffId || meta.stylistId || meta.stylist || '',
        startStep: 3
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((notification) => !notification.isRead && notification._id);
    if (unreadNotifications.length === 0) return;

    const token = localStorage.getItem('token');

    setNotifications((currentNotifications) => currentNotifications.map((notification) => ({
      ...notification,
      isRead: true,
    })));

    await Promise.allSettled(
      unreadNotifications.map((notification) => (
        fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ))
    );

    fetchNotifications();
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
    previouslyFocusedElementRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const dialog = profileDialogRef.current;
      if (!dialog) return;

      const firstFocusable = dialog.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      (firstFocusable || dialog).focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isProfileOpen) return undefined;

    const getFocusableElements = () => {
      const dialog = profileDialogRef.current;
      if (!dialog) return [];

      return Array.from(dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter((element) => (
        !element.disabled
        && element.getAttribute('aria-hidden') !== 'true'
        && element.offsetParent !== null
      ));
    };

    const handleDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeProfile();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        profileDialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => document.removeEventListener('keydown', handleDialogKeyDown);
  }, [closeProfile, isProfileOpen]);

  const role = getStoredSession()?.userRole || user?.role;

  if (!user || !['admin', 'staff', 'customer'].includes(role)) {
    return <Navigate to="/login" replace />;
  }


  const pageTitle = (() => {
    const path = location.pathname;

    if (role === 'admin') {
      if (path.startsWith('/admin/appointments')) return 'Appointments';
      if (path.startsWith('/admin/services')) return 'Services Management';
      if (path.startsWith('/admin/staff')) return 'Staff Management';
      if (path.startsWith('/admin/analytics')) return 'Analytics';
      if (path.startsWith('/admin/reviews')) return 'Review Management';
      if (path.startsWith('/admin/gallery')) return 'Portfolio';
      if (path.startsWith('/admin/settings')) return 'Settings';
      if (path.startsWith('/admin/messages')) return 'Client Inbox';
      return 'Admin Portal';
    }

    if (role === 'staff') {
      if (path.startsWith('/staff/appointments')) return 'Appointments Log';
      if (path.startsWith('/staff/roster-shifts')) return 'Roster & Shifts';
      if (path.startsWith('/staff/earnings')) return 'Earnings';
      if (path.startsWith('/staff/profile')) return 'Staff Profile';
      return 'Staff Portal';
    }

    if (path.startsWith('/booking') || path.startsWith('/book')) {
      return 'Booking Wizard';
    }
    if (path.startsWith('/history')) {
      return 'Booked History';
    }
    if (path.startsWith('/profile')) {
      return 'My Profile';
    }
    return 'Customer Portal';
  })();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const isReviewsPage = location.pathname.startsWith('/admin/reviews');

  return (
    <div className="min-h-screen w-full bg-[#07090d]">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden md:pl-80">
        
        <header className="z-30 flex h-[72px] shrink-0 items-center justify-between bg-[#090d14]/95 px-4 backdrop-blur-md md:px-8">
          
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
                onClick={handleNotificationBellClick}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:text-[#d4af37] transition duration-200"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 22 22" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>

                {/* Unread Yellow Dot */}
                <AnimatePresence>
                  {shouldShowNotificationDot && (
                    <motion.span
                      className="absolute right-2 top-2 flex h-2.5 w-2.5"
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.35 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5a880] opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c5a880] shadow-[0_0_12px_rgba(197,168,128,0.75)]"></span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Dropdown Pop-up */}
              <AnimatePresence>
                {isNotificationOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -14, scale: 0.88 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.92 }}
                    transition={{
                      type: 'spring',
                      stiffness: 360,
                      damping: 28,
                      mass: 0.72,
                    }}
                    className="fixed inset-x-4 top-16 z-50 max-w-[380px] origin-top-right overflow-hidden rounded-2xl border border-[#c5a880]/10 bg-[#1c1c1e] shadow-2xl sm:w-[380px] md:absolute md:inset-auto md:right-0 md:top-full md:mt-3 md:w-[380px]"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 px-4 py-3.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-[#c5a880] transition hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-8 text-center text-xs text-zinc-500">No notifications yet</div>
                      ) : (
                        notifications.map((notif, index) => (
                          <article
                            key={notif._id}
                            className={`flex w-full items-start gap-4 p-4 text-left transition hover:bg-white/[0.04] ${index < notifications.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-zinc-100">
                                {notif.title || 'SalonDEES Update'}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                                {isEmergencyRescheduleNotification(notif) ? (
                                  `${getEmergencyRescheduleMessage(notif.message)} Please reschedule your booking.`
                                ) : (
                                  notif.message
                                )}
                              </span>
                              {isEmergencyRescheduleNotification(notif) && (
                                <span className="mt-2 flex">
                                  <button
                                    type="button"
                                    onClick={(event) => handleRescheduleLinkClick(event, notif)}
                                    className="mt-2 inline-block cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#c5a880] transition-colors hover:text-[#d4af37]"
                                  >
                                    Reschedule Booking &rarr;
                                  </button>
                                </span>
                              )}
                              <span className="mt-2 block text-[11px] font-medium text-zinc-500">
                                {formatRelativeTime(notif.createdAt)}
                              </span>
                            </span>
                            {!notif.isRead && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c5a880]"></span>
                            )}
                          </article>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="flex w-full items-center justify-center border-t border-zinc-800/50 px-4 py-3 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.04] hover:text-[#c5a880]"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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

        <main className={`no-scrollbar min-h-0 w-full flex-1 overflow-y-auto ${isReviewsPage ? 'p-0' : 'p-4 md:p-8 lg:p-10'}`}>
          <Outlet />
        </main>
      </div>

      {isProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md"
          onClick={closeProfile}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
        >
          <div
            ref={profileDialogRef}
            tabIndex={-1}
            className="no-scrollbar relative h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#070707] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="profile-dialog-title" className="sr-only">Profile dialog</h2>
            <RoleProfile onClose={closeProfile} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
