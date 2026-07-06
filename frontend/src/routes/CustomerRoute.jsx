import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredSession } from '../utils/auth';

const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  return '/dashboard';
};

function CustomerRoute({ children }) {
  const location = useLocation();
  const session = getStoredSession();
  const userRole = session?.userRole;
  const isFirstLogin = session?.user?.isFirstLogin === true;

  if (!session) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;

    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  if (userRole !== 'customer') {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  if (isFirstLogin && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ ...location.state, from: location }} />;
  }

  return children;
}

export default CustomerRoute;
