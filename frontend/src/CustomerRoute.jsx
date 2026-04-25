import React from 'react';
import { Navigate } from 'react-router-dom';

const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff/dashboard';
  return '/dashboard';
};

function CustomerRoute({ children }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token || !userRole) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== 'customer') {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
}

export default CustomerRoute;
