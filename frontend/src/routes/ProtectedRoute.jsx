import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredSession } from '../utils/auth';

const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  return '/dashboard';
};

function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const session = getStoredSession();
  const userRole = session?.userRole;

  if (!session) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
}

export default ProtectedRoute;

