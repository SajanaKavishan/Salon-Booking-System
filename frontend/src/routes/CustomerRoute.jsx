import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  return '/dashboard';
};

function CustomerRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const storedUser = localStorage.getItem('user');
  let isFirstLogin = false;

  try {
    isFirstLogin = JSON.parse(storedUser || '{}')?.isFirstLogin === true;
  } catch {
    isFirstLogin = false;
  }

  if (!token || !userRole) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== 'customer') {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  if (isFirstLogin && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return children;
}

export default CustomerRoute;
