import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login'; 
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import CustomerRoute from './CustomerRoute';
import Profile from './pages/Profile';
import BookAppointment from './BookAppointment';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import Register from './pages/Register';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminMessages from './components/AdminMessages';
import Layout from './pages/admin/Layout';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import ClientsPage from './pages/admin/ClientsPage';
import StaffPage from './pages/admin/StaffPage';
import ServicesPage from './pages/admin/ServicesPage';
import StaffProfile from './StaffProfile';

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111]/70 p-8 shadow-xl backdrop-blur-md">
      <h1 className="text-3xl font-serif text-white">{title}</h1>
      <p className="mt-3 text-gray-400">{subtitle}</p>
    </div>
  );
}

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000}  />
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* First, show the home page */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <CustomerRoute>
                <Layout />
              </CustomerRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/booking" element={<BookAppointment />} />
          </Route>

          {/* Admin routes */}  
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<AdminDashboard />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="analytics" element={<PlaceholderPage title="Analytics" subtitle="Analytics dashboard will be available here." />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" subtitle="Account and system settings will be available here." />} />
          </Route>

          <Route 
            path="/staff" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="profile" element={<StaffProfile />} />
          </Route>
          <Route 
            path="/admin/messages" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMessages />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
