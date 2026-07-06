import React from 'react';
import CustomerProfile from '../customer/Profile';
import StaffProfile from '../staff/StaffProfile';
import AdminProfile from '../admin/AdminProfile';
import { getStoredSession } from '../../utils/auth';

function RoleProfile(props) {
  const role = getStoredSession()?.userRole;

  if (role === 'staff') {
    return <StaffProfile {...props} />;
  }

  if (role === 'admin') {
    return <AdminProfile {...props} />;
  }

  return <CustomerProfile {...props} />;
}

export default RoleProfile;
