import React from 'react';
import CustomerProfile from '../customer/Profile';
import StaffProfile from '../staff/StaffProfile';
import AdminProfile from '../admin/AdminProfile';

function RoleProfile(props) {
  const role = localStorage.getItem('userRole');

  if (role === 'staff') {
    return <StaffProfile {...props} />;
  }

  if (role === 'admin') {
    return <AdminProfile {...props} />;
  }

  return <CustomerProfile {...props} />;
}

export default RoleProfile;
