import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  // Check if the token exists in localStorage to determine if the user is authenticated
  const token = localStorage.getItem('token');

  // If no token is found, redirect the user to the login page
  if (!token) {
    return <Navigate to="/" />;
  }

  // If a token exists, render the child components (the protected page)
  return children;
}

export default ProtectedRoute;

