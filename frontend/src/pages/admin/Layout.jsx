import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar';

function Layout() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[url('/registerBg.jpg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/85"></div>
      <Sidebar />
      <main className="no-scrollbar relative z-10 flex-1 overflow-y-auto w-full p-6 lg:p-10 lg:pl-[354px]">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
