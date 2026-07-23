const ROUTE_TITLES = {
  '/': 'Salon DEES',
  '/login': 'Sign In | Salon DEES',
  '/register': 'Create Account | Salon DEES',
  '/forgot-password': 'Forgot Password | Salon DEES',
  '/onboarding': 'Welcome | Salon DEES',
  '/dashboard': 'Dashboard | Salon DEES',
  '/customer/dashboard': 'Dashboard | Salon DEES',
  '/book': 'Book Appointment | Salon DEES',
  '/booking': 'Book Appointment | Salon DEES',
  '/customer/book': 'Book Appointment | Salon DEES',
  '/history': 'Appointment History | Salon DEES',
  '/profile': 'Profile | Salon DEES',
  '/admin': 'Admin Dashboard | Salon DEES',
  '/admin/appointments': 'Appointments | Salon DEES',
  '/admin/staff': 'Salon Staff | Salon DEES',
  '/admin/services': 'Salon Services | Salon DEES',
  '/admin/analytics': 'Analytics | Salon DEES',
  '/admin/reviews': 'Review Management | Salon DEES',
  '/admin/gallery': 'Gallery Management | Salon DEES',
  '/admin/messages': 'Customer Messages | Salon DEES',
  '/admin/settings': 'Settings | Salon DEES',
  '/staff': 'Staff Dashboard | Salon DEES',
  '/staff/dashboard': 'Staff Dashboard | Salon DEES',
  '/staff/appointments': 'Appointments | Salon DEES',
  '/staff/roster-shifts': 'Roster & Leave | Salon DEES',
  '/staff/earnings': 'Earnings | Salon DEES',
  '/staff/profile': 'Staff Profile | Salon DEES',
};

export const getDocumentTitle = (pathname) => {
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  if (/^\/reset-password\/[^/]+$/.test(normalizedPath)) {
    return 'Reset Password | Salon DEES';
  }

  return ROUTE_TITLES[normalizedPath] || 'Page Not Found | Salon DEES';
};
